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
        register(username: String!, email: String!, password: String!): User
        login(email: String!, password: String!): String
        addPost(title: String!, content: String!): Post
    }
`;

export default typeDefs;
