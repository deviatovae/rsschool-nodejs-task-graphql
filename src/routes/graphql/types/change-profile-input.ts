import { GraphQLBoolean, GraphQLInputObjectType, GraphQLNonNull } from 'graphql/index.js';

export const ChangeProfileInput = new GraphQLInputObjectType({
  name: 'ChangeProfileInput',
  fields: () => ({
    isMale: {
      type: GraphQLBoolean,
    },
  }),
});
