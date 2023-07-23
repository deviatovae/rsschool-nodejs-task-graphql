import { GraphQLInputObjectType, GraphQLNonNull, GraphQLString } from 'graphql/index.js';

export const ChangePostInput = new GraphQLInputObjectType({
  name: 'ChangePostInput',
  fields: () => ({
    title: {
      type: GraphQLString,
    },
  }),
});
