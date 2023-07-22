import { GraphQLInputObjectType, GraphQLNonNull } from 'graphql';
import { GraphQLBoolean, GraphQLInt, GraphQLString } from 'graphql/index.js';
import { MemberTypeId } from './member-type-id.js';

export const CreateProfileInput = new GraphQLInputObjectType({
  name: 'CreateProfileInput',
  fields: () => ({
    userId: {
      type: new GraphQLNonNull(GraphQLString),
    },
    isMale: {
      type: new GraphQLNonNull(GraphQLBoolean),
    },
    memberTypeId: {
      type: new GraphQLNonNull(MemberTypeId),
    },
    yearOfBirth: {
      type: new GraphQLNonNull(GraphQLInt),
    },
  }),
});
