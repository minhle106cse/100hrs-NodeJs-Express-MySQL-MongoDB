const { buildSchema } = require('graphql')

const schema = buildSchema(`
  type Post {
    _id: ID!
    title: String!
    content: String!
    imageUrl: String!
    creator: User!
    createdAt: String!
    updatedAt: String!
  }

  type User {
    _id: ID!
    email: String!
    name: String! 
    status: String!
    posts: [Post!]!
  }

  type LoginData {
    userId: ID!
    token: String! 
  }

  type PostData {
    posts: [Post!]!
    totalPosts: Int!
  }

  type RootQuery {
    login(email: String!, password: String!):  LoginData!
    posts(page: Int!): PostData!
    post(id: ID!): Post!
    user: User!
  }

  
  input UserInput {
    email: String!
    name: String!
    password: String!
  }

  input PostInput{
    title: String!
    content: String!
    imageUrl: String!
  }
 
  type RootMutation {
    createUser(userInput: UserInput!): User!
    createPost(postInput: PostInput!): Post!
    updatePost(id: ID!, postInput: PostInput!): Post!
    deletePost(id: ID!): Boolean
    updateStatus(status: String!): User!
  }

  schema { 
    mutation: RootMutation
    query: RootQuery
  }
`)

module.exports = schema
