import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Post from '../models/Post.js';
import * as http from "node:http";

const resolvers = {
    Query: {
        me: async (_, __, {req}) => {
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
        }

        ,
        getPosts: async () => {
            return await Post.find().populate('author')
        },
        getPostById: async (_, {id}) => {
            return await Post.findById(id).populate('author');
        }

    },
    Mutation: {
        addPost: async (_, { title, content }, { user }) => {
            if (!user) throw new Error("No autenticado");
            const post = new Post({
                title,
                content,
                author: user.id,
                createdAt: new Date(),
                updatedAt: new Date(),
            });
            await post.save();
            return post.populate('author');
        },
        updatePost: async (_, { id, title, content }, { user }) => {
            if (!user) throw new Error("No autenticado");
            const post = await Post.findOneAndUpdate(
                { _id: id, author: user.id },
                { title, content, updatedAt: new Date() },
                { new: true }
            );
            if (!post) throw new Error("Publicación no encontrada o usuario no autorizado");
            return post.populate('author');
        },
        deletePost: async (_, { id }, { user }) => {
            if (!user) throw new Error("No autenticado");
            const post = await Post.findOneAndDelete({ _id: id, author: user.id });
            if (!post) throw new Error("Publicación no encontrada o usuario no autorizado");
            return "Publicación eliminada";
        },
        register: async (_, {username, email, password}) => {
            console.log("Iniciando registro de usuario...");

            // Verificación de email
            const existingUser = await User.findOne({email});
            if (existingUser) {
                throw new Error("Este correo electrónico ya está registrado");
            }

            // Verificación de username
            const existingUserByUsername = await User.findOne({username});
            if (existingUserByUsername) {
                throw new Error("Este nombre de usuario ya está registrado.");
            }

            // Creación de usuario
            const hashedPassword = await bcrypt.hash(password, 10);
            const user = new User({username, email, password: hashedPassword});
            await user.save();

            console.log("Usuario creado:", user);

            // Generación del token
            const token = jwt.sign({id: user.id, email: user.email}, process.env.SECRET, {expiresIn: '1d'});

            console.log("Token generado:", token);

            if (!token) {
                throw new Error("No se pudo generar el token");
            }

            return {token, user};
        },
        login: async (_, {email, password}, {res}) => {
            console.log("Intentando iniciar sesion con:", email);
            const user = await User.findOne({email});
            if (!user) {
                console.log("Usuario no encontrado");
                throw new Error('Usuario no encontrado');
            }

            const valid = await bcrypt.compare(password, user.password);
            if (!valid) {
                console.log("Contraseña incorrecta")
                throw new Error('Contraseña incorrecta');
            }

            const token = jwt.sign({id: user.id, email: user.email}, process.env.SECRET, {expiresIn: '1d'});
            res.cookie('authToken', token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'Strict',

            });

            console.log("Cookie configurada correctamente")
            return {token, user};
        },


        refreshToken: (_, __, {user}) => {
            if (!user) throw new Error("No autenticado");
            return jwt.sign({id: user.id, email: user.email}, process.env.SECRET, {expiresIn: '1d'});
        },



        logout: (_, __, {res}) => {
            res.clearCookie('authToken', {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'Strict',
            });
            return {message: 'Cierre de sesión exitoso'};
        },


    },
    User: {
        posts: (user) => Post.find({author: user.id}),
    },
    Post: {
        author: (post) => User.findById(post.author),
    },
};

export default resolvers;
