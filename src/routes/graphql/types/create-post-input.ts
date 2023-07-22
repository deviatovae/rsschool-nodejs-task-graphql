import { GraphQLInputObjectType, GraphQLNonNull } from 'graphql';
import { GraphQLString } from 'graphql/index.js';
import { UUIDType } from './uuid.js';

export const CreatePostInput = new GraphQLInputObjectType({
  name: 'CreatePostInput',
  fields: () => ({
    authorId: {
      type: new GraphQLNonNull(GraphQLString),
    },
    content: {
      type: new GraphQLNonNull(GraphQLString),
    },
    title: {
      type: new GraphQLNonNull(GraphQLString),
    },
  }),
});
