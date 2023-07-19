import { GraphQLObjectType } from 'graphql';
import { GraphQLString } from 'graphql/index.js';
import { UUIDType } from './uuid.js';

export const Post = new GraphQLObjectType({
  name: 'Post',
  fields: () => ({
    id: {
      type: UUIDType,
    },
    title: {
      type: GraphQLString,
    },
    content: {
      type: GraphQLString,
    },
  }),
});
