import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Post from '../models/Post.js';

const resolvers = {
    Query: {
        me: async (_, __, { req }) => {
            console.log('Cookies recibidas en resolver:', req.cookies);

            if (!req.cookies || !req.cookies.authToken) {
                throw new Error("No autenticado: no se encontró la cookie authToken.");
            }

            try {
                const token = req.cookies.authToken;
                const decoded = jwt.verify(token, process.env.SECRET);

                console.log('Token decodificado:', decoded);

                const user = await User.findById(decoded.id);
                if (!user) {
                    throw new Error("Usuario no encontrado.");
                }

                return user;
            } catch (error) {
                console.error("Error al verificar el token:", error.message);
                throw new Error("Token inválido.");
            }
        },

        getPosts: async () => {
            try {
                return await Post.find().populate('author', 'username email'); // Especifica los campos necesarios
            } catch (err) {
                console.error('Error al obtener las publicaciones:', err.message);
                throw new Error(`Error al obtener las publicaciones: ${err.message}`);
            }
        },
        getMyPosts: async (_, __, { user }) => {
            if (!user) throw new Error("No autenticado");
            try {
                return await Post.find({ author: user.id }).populate('author', 'username email');
            } catch (err) {
                throw new Error(`Error al obtener las publicaciones propias: ${err.message}`);
            }
        },

        getPostById: async (_, { id }) => {
            try {
                return await Post.findById(id).populate('author', 'username email');
            } catch (err) {
                console.error('Error al obtener la publicación:', err.message);
                throw new Error(`Error al obtener la publicación: ${err.message}`);
            }
        },
    },

    Mutation: {
        addPost: async (_, { title, content }, { user }) => {
            if (!user) throw new Error("No autenticado");
            try {
                const post = new Post({
                    title,
                    content,
                    author: user.id,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                });
                await post.save();
                return post.populate('author', 'username email');
            } catch (err) {
                console.error('Error al crear publicación:', err.message);
                throw new Error(`Error al crear publicación: ${err.message}`);
            }
        },

        updatePost: async (_, { id, title, content }, { user }) => {
            if (!user) throw new Error("No autenticado");
            try {
                const post = await Post.findOneAndUpdate(
                    { _id: id, author: user.id },
                    { title, content, updatedAt: new Date() },
                    { new: true }
                ).populate('author', 'username email');
                if (!post) throw new Error("Publicación no encontrada o usuario no autorizado");
                return post;
            } catch (err) {
                console.error('Error al actualizar la publicación:', err.message);
                throw new Error(`Error al actualizar la publicación: ${err.message}`);
            }
        },

        deletePost: async (_, { id }, { user }) => {
            if (!user) throw new Error("No autenticado");
            try {
                const post = await Post.findOneAndDelete({ _id: id, author: user.id });
                if (!post) throw new Error("Publicación no encontrada o usuario no autorizado");
                return "Publicación eliminada con éxito";
            } catch (err) {
                console.error('Error al eliminar la publicación:', err.message);
                throw new Error(`Error al eliminar la publicación: ${err.message}`);
            }
        },

        register: async (_, { username, email, password }) => {
            try {
                const existingUser = await User.findOne({ email });
                if (existingUser) {
                    throw new Error("Este correo electrónico ya está registrado");
                }

                const existingUserByUsername = await User.findOne({ username });
                if (existingUserByUsername) {
                    throw new Error("Este nombre de usuario ya está registrado.");
                }

                const hashedPassword = await bcrypt.hash(password, 10);
                const user = new User({ username, email, password: hashedPassword });
                await user.save();

                const token = jwt.sign({ id: user.id, email: user.email }, process.env.SECRET, { expiresIn: '1d' });
                return { token, user };
            } catch (err) {
                console.error('Error al registrar usuario:', err.message);
                throw new Error(`Error al registrar usuario: ${err.message}`);
            }
        },

        login: async (_, { email, password }, { res }) => {
            try {
                const user = await User.findOne({ email });
                if (!user) {
                    throw new Error('Usuario no encontrado');
                }

                const valid = await bcrypt.compare(password, user.password);
                if (!valid) {
                    throw new Error('Contraseña incorrecta');
                }

                const token = jwt.sign({ id: user.id, email: user.email }, process.env.SECRET, { expiresIn: '1d' });
                res.cookie('authToken', token, {
                    httpOnly: true,
                    secure: process.env.NODE_ENV === 'production',
                    sameSite: 'Strict',
                });

                return { token, user };
            } catch (err) {
                console.error('Error al iniciar sesión:', err.message);
                throw new Error(`Error al iniciar sesión: ${err.message}`);
            }
        },

        logout: (_, __, { res }) => {
            res.clearCookie('authToken', {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'Strict',
            });
            return { message: 'Cierre de sesión exitoso' };
        },
    },

    User: {
        posts: async (user) => {
            try {
                return await Post.find({ author: user.id });
            } catch (err) {
                console.error('Error al obtener las publicaciones del usuario:', err.message);
                throw new Error(`Error al obtener las publicaciones del usuario: ${err.message}`);
            }
        },
    },

    Post: {
        author: async (post) => {
            try {
                return await User.findById(post.author);
            } catch (err) {
                console.error('Error al obtener el autor de la publicación:', err.message);
                throw new Error(`Error al obtener el autor de la publicación: ${err.message}`);
            }
        },
    },
};

export default resolvers;
