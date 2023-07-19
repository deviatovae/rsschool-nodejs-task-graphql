import { GraphQLFloat, GraphQLObjectType } from 'graphql';
import { GraphQLString } from 'graphql/index.js';
import { UUIDType } from './uuid.js';

export const User = new GraphQLObjectType({
  name: 'User',
  fields: () => ({
    id: {
      type: UUIDType,
    },
    name: {
      type: GraphQLString,
    },
    balance: {
      type: GraphQLFloat,
    },
  }),
});
