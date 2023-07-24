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
import { MemberType as GraphQLMemberType } from './types/member-type.js';
import { UUID } from 'crypto';
import { UUIDType } from './types/uuid.js';
import {
  GraphQLBoolean,
  GraphQLFloat,
  GraphQLInt,
  GraphQLString,
} from 'graphql/index.js';
import { MemberType, Post, Profile, User } from '@prisma/client';
import depthLimit from 'graphql-depth-limit';
import { MemberTypeId as GraphQLMemberTypeId } from './types/member-type-id.js';
import { MemberTypeId } from '../member-types/schemas.js';
import { CreateUserInput } from './types/create-user-input.js';
import { CreatePostInput } from './types/create-post-input.js';
import { CreateProfileInput } from './types/create-profile-input.js';
import { ChangePostInput } from './types/change-post-input.js';
import { ChangeUserInput } from './types/change-user-input.js';
import { ChangeProfileInput } from './types/change-profile-input.js';
import DataLoader from 'dataloader';
import { PostType } from './types/postType.js';

const plugin: FastifyPluginAsyncTypebox = async (fastify) => {
  const { prisma } = fastify;

  const postLoader = new DataLoader<string, Post[]>(async (userIds) => {
    const posts = await prisma.post.findMany({
      where: {
        authorId: {
          in: [...userIds],
        },
      },
    });
    const postsMap: { [key: string]: Post[] } = {};
    posts.forEach((post) => {
      if (!postsMap[post.authorId]) {
        postsMap[post.authorId] = [];
      }
      postsMap[post.authorId].push(post);
    });
    return userIds.map((userId) => postsMap[userId]);
  });

  const profileLoader = new DataLoader<string, Profile>(async (userIds) => {
    const profiles = await prisma.profile.findMany({
      where: {
        userId: {
          in: [...userIds],
        },
      },
    });
    const profilesMap: { [key: string]: Profile } = {};
    profiles.forEach((profile) => {
      profilesMap[profile.userId] = profile;
    });
    return userIds.map((userId) => profilesMap[userId]);
  });

  const memberTypeLoader = new DataLoader<string, MemberType>(async (memberTypeIds) => {
    const memberTypes = await prisma.memberType.findMany({
      where: {
        id: {
          in: [...memberTypeIds],
        },
      },
    });
    const memberTypesMap: { [key: string]: MemberType } = {};
    memberTypes.forEach((memberType) => {
      memberTypesMap[memberType.id] = memberType;
    });
    return memberTypeIds.map((memberTypeId) => memberTypesMap[memberTypeId]);
  });

  const userSubscribedToLoader = new DataLoader<string, User[]>(async (userIds) => {
    const subscribers = await prisma.subscribersOnAuthors.findMany({
      where: { subscriberId: { in: [...userIds] } },
      select: { subscriberId: true, author: true },
    });

    const subscribersMap: { [key: string]: User[] } = {};
    subscribers.forEach((subscriber) => {
      if (!subscribersMap[subscriber.subscriberId]) {
        subscribersMap[subscriber.subscriberId] = [];
      }
      subscribersMap[subscriber.subscriberId].push(subscriber.author);
    });
    return userIds.map((userId) => subscribersMap[userId] || []);
  });

  const subscribedToUserLoader = new DataLoader<string, User[]>(async (userIds) => {
    const subscribers = await prisma.subscribersOnAuthors.findMany({
      where: { authorId: { in: userIds as string[] } },
      select: { authorId: true, subscriber: true },
    });

    const subscribersMap: { [key: string]: User[] } = {};
    subscribers.forEach((subscriber) => {
      if (!subscribersMap[subscriber.authorId]) {
        subscribersMap[subscriber.authorId] = [];
      }
      subscribersMap[subscriber.authorId].push(subscriber.subscriber);
    });
    return userIds.map((userId) => subscribersMap[userId] || []);
  });

  const userLoader = new DataLoader<string, User>(async (userIds) => {
    const users = await prisma.user.findMany({
      where: { id: { in: [...userIds] } },
      include: {
        userSubscribedTo: true,
        subscribedToUser: true,
      },
    });

    const userMap = users.reduce(
      (acc, user) => {
        acc[user.id] = user;
        return acc;
      },
      {} as Record<string, User>,
    );

    return userIds.map((id) => userMap[id]);
  });

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
        type: GraphQLMemberType,
        resolve: async (profile: Profile) => {
          return await memberTypeLoader.load(profile.memberTypeId);
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
        resolve: async (user: User) => {
          return await userSubscribedToLoader.load(user.id);
        },
      },
      subscribedToUser: {
        type: new GraphQLList(User),
        resolve: async (user: User) => {
          return await subscribedToUserLoader.load(user.id);
        },
      },
      profile: {
        type: Profile,
        resolve: async (user: User) => {
          return await profileLoader.load(user.id);
        },
      },
      posts: {
        type: new GraphQLList(PostType),
        resolve: async (user: User) => {
          return await postLoader.load(user.id);
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
              resolve: async () => {
                const users = await prisma.user.findMany({
                  include: {
                    userSubscribedTo: true,
                    subscribedToUser: true,
                  },
                });

                users.forEach((user) => {
                  userLoader.prime(user.id, user);
                });

                return users;
              },
            },
            posts: {
              type: new GraphQLList(PostType),
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
              type: new GraphQLList(GraphQLMemberType),
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
              type: GraphQLMemberType,
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
              type: PostType,
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
              type: PostType,
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

            changeUser: {
              type: User as GraphQLObjectType,
              args: {
                id: {
                  type: new GraphQLNonNull(UUIDType),
                },
                dto: {
                  type: new GraphQLNonNull(ChangeUserInput),
                },
              },

              resolve: (_, { id, dto }: { id: UUID; dto: { name: string } }) => {
                return prisma.user.update({
                  where: { id },
                  data: dto,
                });
              },
            },

            changePost: {
              type: PostType,
              args: {
                id: {
                  type: new GraphQLNonNull(UUIDType),
                },
                dto: {
                  type: new GraphQLNonNull(ChangePostInput),
                },
              },

              resolve: (_, { id, dto }: { id: UUID; dto: { title: string } }) => {
                return prisma.post.update({
                  where: { id },
                  data: dto,
                });
              },
            },

            changeProfile: {
              type: Profile,
              args: {
                id: {
                  type: new GraphQLNonNull(UUIDType),
                },
                dto: {
                  type: new GraphQLNonNull(ChangeProfileInput),
                },
              },

              resolve: (_, { id, dto }: { id: UUID; dto: { isMale: boolean } }) => {
                return prisma.profile.update({
                  where: { id },
                  data: dto,
                });
              },
            },

            subscribeTo: {
              type: User as GraphQLObjectType,
              args: {
                userId: {
                  type: new GraphQLNonNull(UUIDType),
                },
                authorId: {
                  type: new GraphQLNonNull(UUIDType),
                },
              },

              resolve: (_, { userId, authorId }: { userId: UUID; authorId: UUID }) => {
                return prisma.user.update({
                  where: {
                    id: userId,
                  },
                  data: {
                    userSubscribedTo: {
                      create: {
                        authorId,
                      },
                    },
                  },
                });
              },
            },

            unsubscribeFrom: {
              type: GraphQLBoolean,
              args: {
                userId: {
                  type: new GraphQLNonNull(UUIDType),
                },
                authorId: {
                  type: new GraphQLNonNull(UUIDType),
                },
              },

              resolve: async (
                _,
                { userId, authorId }: { userId: UUID; authorId: UUID },
              ) => {
                return !!(await prisma.subscribersOnAuthors.delete({
                  where: {
                    subscriberId_authorId: {
                      subscriberId: userId,
                      authorId,
                    },
                  },
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
