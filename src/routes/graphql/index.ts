import { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox';
import { createGqlResponseSchema, gqlResponseSchema } from './schemas.js';
import { User } from './types/user.js';
import { graphql, GraphQLList, GraphQLObjectType, GraphQLSchema, Source } from 'graphql';
import { Post } from './types/post.js';

const plugin: FastifyPluginAsyncTypebox = async (fastify) => {
  const { prisma } = fastify;

  fastify.route({
    url: '/',
    method: 'POST',
    schema: {
      ...createGqlResponseSchema,
      response: {
        200: gqlResponseSchema,
      },
    },
    async handler(req) {
      return graphql({
        schema: new GraphQLSchema({
          query: new GraphQLObjectType({
            name: 'Query',
            fields: () => ({
              users: {
                type: new GraphQLList(User),
                resolve: () => {
                  return prisma.user.findMany();
                },
              },
              posts: {
                type: new GraphQLList(Post),
                resolve: () => {
                  return prisma.post.findMany();
                },
              },
            }),
          }),
        }),
        source: new Source(req.body.query),
        variableValues: req.body.variables,
      });
    },
  });
};

export default plugin;
