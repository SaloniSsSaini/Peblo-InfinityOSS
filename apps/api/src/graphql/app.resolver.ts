import { Field, ObjectType, Query, Resolver } from '@nestjs/graphql';

@ObjectType()
class HealthGraph {
  @Field()
  status!: string;
}

@Resolver()
export class AppResolver {
  @Query(() => HealthGraph)
  graphHealth(): HealthGraph {
    return { status: 'ok' };
  }
}
