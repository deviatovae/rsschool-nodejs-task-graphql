import { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox';
import { createGqlResponseSchema, gqlResponseSchema } from './schemas.js';
import {
  graphql,
  GraphQLList,
  GraphQLObjectType,
  GraphQLSchema,
  parse,
  Source,
  validate,
} from 'graphql';
import { Post } from './types/post.js';
import { Profile } from './types/profile.js';
import { MemberType } from './types/member-type.js';
import { UUID } from 'crypto';
import { UUIDType } from './types/uuid.js';
import { GraphQLFloat, GraphQLString } from 'graphql/index.js';
import { User } from '@prisma/client';
import depthLimit from 'graphql-depth-limit';

const plugin: FastifyPluginAsyncTypebox = async (fastify) => {
  const { prisma } = fastify;

  const User = new GraphQLObjectType({
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
      userSubscribedTo: {
        type: new GraphQLList(User),
        resolve: (user: User) => {
          return prisma.user.findMany({
            where: {
              userSubscribedTo: {
                some: {
                  authorId: user.id,
                },
              },
            },
          });
        },
      },
    }),
  });

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
      const source = new Source(req.body.query);
      const schema = new GraphQLSchema({
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
            profiles: {
              type: new GraphQLList(Profile),
              resolve: () => {
                return prisma.profile.findMany();
              },
            },
            memberTypes: {
              type: new GraphQLList(MemberType),
              resolve: () => {
                return prisma.memberType.findMany();
              },
            },

            user: {
              type: User as GraphQLObjectType,
              args: {
                id: {
                  type: UUIDType,
                },
              },
              resolve: (_source, { id }: { id: UUID }) => {
                return prisma.user.findUnique({
                  where: { id },
                });
              },
            },
          }),
        }),
      });

      const errors = validate(schema, parse(source), [depthLimit(5)]);
      if (errors.length) {
        return {
          errors,
        };
      }

      return graphql({
        schema: schema,
        source: source,
        variableValues: req.body.variables,
        contextValue: { prisma },
      });
    },
  });
};

export default plugin;
