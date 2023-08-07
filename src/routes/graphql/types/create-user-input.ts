import { GraphQLInputObjectType, GraphQLNonNull } from 'graphql';
import { GraphQLFloat, GraphQLString } from 'graphql/index.js';

export const CreateUserInput = new GraphQLInputObjectType({
  name: 'CreateUserInput',
  fields: () => ({
    name: {
      type: new GraphQLNonNull(GraphQLString),
    },

    balance: {
      type: new GraphQLNonNull(GraphQLFloat),
      defaultValue: 0,
    },
  }),
});
