import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Post from '../models/Post.js';

const resolvers = {
    Query: {
        me: async (_, __, {user}) => {
            if (!user) throw new Error("No autenticado");
            return User.findById(user.id).populate('posts');
        },
        getPosts: () => Post.find().populate('author'),


    },
    Mutation: {
        register: async (_, { username, email, password }) => {
            console.log("Iniciando registro de usuario...");

            // Verificación de email
            const existingUser = await User.findOne({ email });
            if (existingUser) {
                throw new Error("Este correo electrónico ya está registrado");
            }

            // Verificación de username
            const existingUserByUsername = await User.findOne({ username });
            if (existingUserByUsername) {
                throw new Error("Este nombre de usuario ya está registrado.");
            }

            // Creación de usuario
            const hashedPassword = await bcrypt.hash(password, 10);
            const user = new User({ username, email, password: hashedPassword });
            await user.save();

            console.log("Usuario creado:", user);

            // Generación del token
            const token = jwt.sign({ id: user.id, email: user.email }, process.env.SECRET, { expiresIn: '1d' });

            console.log("Token generado:", token);

            if (!token) {
                throw new Error("No se pudo generar el token");
            }

            return { token, user };
        },
        login: async (_, {email, password}) => {
            const user = await User.findOne({email});
            if (!user) throw new Error('Usuario no encontrado');

            const valid = await bcrypt.compare(password, user.password);
            if (!valid) throw new Error('Contraseña incorrecta');

            const token = jwt.sign({id: user.id, email: user.email}, process.env.SECRET, {expiresIn: '1d'});
            return {token, user};
        },
        addPost: async (_, {title, content}, {user}) => {
            if (!user) throw new Error("No autenticado");

            const post = new Post({title, content, author: user.id});
            await post.save();

            return post;
        },

        refreshToken: (_, __, {user}) => {
            if (!user) throw new Error("No autenticado");
            return jwt.sign({id: user.id, email: user.email}, process.env.SECRET, {expiresIn: '1d'});
        },

        updatePost: async (_, {id, title, content}, {user}) => {
            if (!user) throw new Error("No autenticado");
            const post = await Post.findOneAndUpdate(
                {_id: id, author: user.id},
                {title, content},
                {new: true}
            );
            if (!post) throw new Error("Publicación no encontrada o usuario no autorizado");
            return post;
        },
        deletePost: async (_, {id}, {user}) => {
            if (!user) throw new Error("No autenticado");
            const post = await Post.findOneAndDelete({_id: id, author: user.id});
            if (!post) throw new Error("Publicación no encontrada o usuario no autorizado");
            return "Publicación eliminada";
        }


    },
    User: {
        posts: (user) => Post.find({author: user.id}),
    },
    Post: {
        author: (post) => User.findById(post.author),
    },
};

export default resolvers;
