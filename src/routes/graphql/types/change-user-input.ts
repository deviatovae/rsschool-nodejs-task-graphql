import { GraphQLInputObjectType, GraphQLNonNull, GraphQLString } from 'graphql/index.js';

export const ChangeUserInput = new GraphQLInputObjectType({
  name: 'ChangeUserInput',
  fields: () => ({
    name: {
      type: GraphQLString,
    },
  }),
});
