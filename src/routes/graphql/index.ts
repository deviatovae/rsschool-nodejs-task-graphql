import { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox';
import { createGqlResponseSchema, gqlResponseSchema } from './schemas.js';
import {
  graphql,
  GraphQLList,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLSchema,
  parse,
  Source,
  validate,
} from 'graphql';
import { Post } from './types/post.js';
import { MemberType } from './types/member-type.js';
import { UUID } from 'crypto';
import { UUIDType } from './types/uuid.js';
import {
  GraphQLBoolean,
  GraphQLFloat,
  GraphQLInt,
  GraphQLString,
} from 'graphql/index.js';
import { Profile, User } from '@prisma/client';
import depthLimit from 'graphql-depth-limit';
import { MemberTypeId as GraphQLMemberTypeId } from './types/member-type-id.js';
import { MemberTypeId } from '../member-types/schemas.js';
import { CreateUserInput } from './types/create-user-input.js';
import { CreatePostInput } from './types/create-post-input.js';
import { CreateProfileInput } from './types/create-profile-input.js';

const plugin: FastifyPluginAsyncTypebox = async (fastify) => {
  const { prisma } = fastify;

  const Profile = new GraphQLObjectType({
    name: 'Profile',
    fields: () => ({
      id: {
        type: UUIDType,
      },
      isMale: {
        type: GraphQLBoolean,
      },
      yearOfBirth: {
        type: GraphQLInt,
      },
      memberType: {
        type: MemberType,
        resolve: (profile: Profile) => {
          return prisma.memberType.findUnique({
            where: {
              id: profile.memberTypeId,
            },
          });
        },
      },
    }),
  });

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
              subscribedToUser: {
                some: {
                  subscriberId: user.id,
                },
              },
            },
          });
        },
      },
      subscribedToUser: {
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
      profile: {
        type: Profile,
        resolve: (user: User) => {
          return prisma.profile.findUnique({
            where: {
              userId: user.id,
            },
          });
        },
      },
      posts: {
        type: new GraphQLList(Post),
        resolve: (user: User) => {
          return prisma.post.findMany({
            where: {
              authorId: user.id,
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
                  type: new GraphQLNonNull(UUIDType),
                },
              },
              resolve: (_source, { id }: { id: UUID }) => {
                return prisma.user.findUnique({
                  where: { id },
                });
              },
            },

            memberType: {
              type: MemberType,
              args: {
                id: {
                  type: new GraphQLNonNull(GraphQLMemberTypeId),
                },
              },
              resolve: (_source, { id }: { id: MemberTypeId }) => {
                return prisma.memberType.findUnique({
                  where: { id },
                });
              },
            },

            post: {
              type: Post,
              args: {
                id: {
                  type: new GraphQLNonNull(UUIDType),
                },
              },
              resolve: (_source, { id }: { id: UUID }) => {
                return prisma.post.findUnique({
                  where: { id },
                });
              },
            },

            profile: {
              type: Profile,
              args: {
                id: {
                  type: new GraphQLNonNull(UUIDType),
                },
              },
              resolve: (_source, { id }: { id: UUID }) => {
                return prisma.profile.findUnique({
                  where: { id },
                });
              },
            },
          }),
        }),

        mutation: new GraphQLObjectType({
          name: 'Mutation',
          fields: () => ({
            createUser: {
              type: User as GraphQLObjectType,
              args: {
                dto: {
                  type: new GraphQLNonNull(CreateUserInput),
                },
              },
              resolve: (_, { dto }: { dto: { name: string; balance: number } }) => {
                return prisma.user.create({
                  data: dto,
                });
              },
            },

            createPost: {
              type: Post,
              args: {
                dto: {
                  type: new GraphQLNonNull(CreatePostInput),
                },
              },
              resolve: (
                _,
                { dto }: { dto: { authorId: string; content: UUID; title: UUID } },
              ) => {
                return prisma.post.create({
                  data: dto,
                });
              },
            },

            createProfile: {
              type: Profile,
              args: {
                dto: {
                  type: new GraphQLNonNull(CreateProfileInput),
                },
              },
              resolve: (
                _,
                {
                  dto,
                }: {
                  dto: {
                    userId: string;
                    isMale: boolean;
                    memberTypeId: MemberTypeId;
                    yearOfBirth: number;
                  };
                },
              ) => {
                return prisma.profile.create({
                  data: dto,
                });
              },
            },

            deleteUser: {
              type: GraphQLBoolean,
              args: {
                id: {
                  type: new GraphQLNonNull(UUIDType),
                },
              },

              resolve: async (_, { id }: { id: UUID }) => {
                return !!(await prisma.user.delete({
                  where: { id },
                }));
              },
            },

            deletePost: {
              type: GraphQLBoolean,
              args: {
                id: {
                  type: new GraphQLNonNull(UUIDType),
                },
              },

              resolve: async (_, { id }: { id: UUID }) => {
                return !!(await prisma.post.delete({
                  where: { id },
                }));
              },
            },

            deleteProfile: {
              type: GraphQLBoolean,
              args: {
                id: {
                  type: new GraphQLNonNull(UUIDType),
                },
              },

              resolve: async (_, { id }: { id: UUID }) => {
                return !!(await prisma.profile.delete({
                  where: { id },
                }));
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
