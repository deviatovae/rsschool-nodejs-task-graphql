import { GraphQLFloat, GraphQLInt, GraphQLObjectType } from 'graphql';
import { GraphQLString } from 'graphql/index.js';

export const MemberType = new GraphQLObjectType({
  name: 'MemberType',
  fields: () => ({
    id: {
      type: GraphQLString,
    },
    discount: {
      type: GraphQLFloat,
    },
    postsLimitPerMonth: {
      type: GraphQLInt,
    },
  }),
});
