import 'dotenv/config';
import {ApolloServer} from 'apollo-server-express';
import express from 'express';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import cookieParser from 'cookie-parser'; // Para manejar cookies
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

// Middleware para verificar usuario a partir del token en cookies
const getUser = (req) => {
    try {
        console.log("Intentando obtener cookies", req.cookies);

        const token = req.cookies.authToken; // Leer token de las cookies
        if (!token) {
            console.log("No se encontro la cookie authToken");
            return null;

        }
        const decoded = jwt.verify(token, process.env.SECRET);
        console.log('Token verificado correctamente', decoded);
        return decoded;

    } catch (error) {
        console.error("Error al verificar token", error.message)
        return null;
    }
};

const startServer = async () => {
    const app = express();
    app.use(cookieParser()); // Middleware para cookies
    app.use(express.json());
    const server = new ApolloServer({
        typeDefs,
        resolvers,
        context: ({req, res}) => {
            console.log('Cookies recibidas', req.cookies);
            const user = getUser(req);
            return {user, res}; // Pasamos `res` para manejar cookies en los resolvers
        },
    });

    // Inicia Apollo Server
    await server.start();

    // Configurar Apollo Server con Express
    server.applyMiddleware({
        app,
        cors: {origin: 'http://localhost:3000', credentials: true}, // Permitir cookies en el cliente
    });

    // Iniciar el servidor
    const PORT = process.env.PORT || 4000;
    app.listen(PORT, () => {
        console.log(`🚀 Servidor listo en http://localhost:${PORT}${server.graphqlPath}`);
    });
};

startServer().catch((err) => {
    console.error('Error al iniciar el servidor:', err);
});
