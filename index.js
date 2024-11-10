import 'dotenv/config';
import { ApolloServer } from 'apollo-server';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import typeDefs from './schema/typeDefs.js';
import resolvers from './resolvers/index.js';

// Conectar a MongoDB Atlas
mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
}).then(() => {
    console.log('Conectado a MongoDB Atlas');
}).catch(err => {
    console.error('Error al conectar con MongoDB Atlas', err);
});

// Middleware de autenticación
const getUser = (token) => {
    try {
        if (token) {
            return jwt.verify(token, process.env.SECRET);
        }
        return null;
    } catch (error) {
        return null;
    }
};

const server = new ApolloServer({
    typeDefs,
    resolvers,
    context: ({ req }) => {
        const token = req.headers.authorization || '';
        const user = getUser(token.replace('Bearer ', ''));
        return { user };
    },
});

// Iniciar el servidor
server.listen().then(({ url }) => {
    console.log(`🚀  Servidor listo en ${url}`);
});
