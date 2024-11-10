import { gql } from 'apollo-server';

const typeDefs = gql`
    type User {
        id: ID!
        username: String!
        email: String!
        posts: [Post]
    }

    type Post {
        id: ID!
        title: String!
        content: String!
        author: User
    }

    type Query {
        me: User
        getPosts: [Post]
    }

    type Mutation {
        register(username: String!, email: String!, password: String!): AuthPayload
        login(email: String!, password: String!): AuthPayload
        addPost(title: String!, content: String!): Post
        refreshToken: String
        updatePost(id: ID!, title: String, content: String): Post
        deletePost(id: ID!): String
    },
    type AuthPayload {
        token: String!
        user: User!
    }
   
`;

export default typeDefs;
