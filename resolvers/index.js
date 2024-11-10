import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Post from '../models/Post.js';

const resolvers = {
    Query: {
        me: async (_, __, { user }) => {
            if (!user) throw new Error("No autenticado");
            return User.findById(user.id).populate('posts');
        },
        getPosts: () => Post.find().populate('author'),
    },
    Mutation: {
        register: async (_, { username, email, password }) => {
            const hashedPassword = await bcrypt.hash(password, 10);
            const user = new User({ username, email, password: hashedPassword });
            await user.save();
            return user;
        },
        login: async (_, { email, password }) => {
            const user = await User.findOne({ email });
            if (!user) throw new Error('Usuario no encontrado');

            const valid = await bcrypt.compare(password, user.password);
            if (!valid) throw new Error('Contraseña incorrecta');

            const token = jwt.sign({ id: user.id, email: user.email }, process.env.SECRET, { expiresIn: '1d' });
            return token;
        },
        addPost: async (_, { title, content }, { user }) => {
            if (!user) throw new Error("No autenticado");

            const post = new Post({ title, content, author: user.id });
            await post.save();

            return post;
        },
    },
    User: {
        posts: (user) => Post.find({ author: user.id }),
    },
    Post: {
        author: (post) => User.findById(post.author),
    },
};

export default resolvers;
