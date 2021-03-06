import { CacheModule, Module } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { DefaultAdminModule, AdminUserEntity } from 'nestjs-admin';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { FirebaseModule } from 'nestjs-firebase';
import { RedisClientOptions } from 'redis';
import * as redisStore from 'cache-manager-redis-store';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { SavingsGroupModule } from './savings-group/savings-group.module';
import { AccountModule } from './account/account.module';
import { TransactionModule } from './transaction/transaction.module';
import { User } from './user/entities/user.entity';
import { Account } from './account/entities/account.entity';
import { Transaction } from './transaction/entities/transaction.entity';
import { SavingsGroup } from './savings-group/entities/savings-group.entity';
import { UserToSavingsGroup } from './common/entities/user-to-savingsgroup.entity';
import { HttpCacheInterceptor } from './common/interceptors/http-cache-interceptor';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import configuration from './config/configuration';

@Module({
  imports: [
    ConfigModule.forRoot({
      cache: true,
      isGlobal: true,
      load: [configuration],
    }),

    TypeOrmModule.forRootAsync({
      useFactory: async (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('DB_HOST'),
        port: configService.get<number>('DB_PORT'),
        username: configService.get<string>('DB_USERNAME'),
        password: configService.get<string>('DB_PASSWORD'),
        database: configService.get<string>('DB_DATABASE'),
        entities: [Account, SavingsGroup, Transaction, User, UserToSavingsGroup, AdminUserEntity],
        migrations: ['dist/migrations/*.js'],
        migrationsTableName: 'migrations_history',
        synchronize: true,    // Auto-Sync currently enabled here because of -d /path-to-datasource option issue with typeorm:generate in package.json scripts for typeorm version ^0.3.x
        ssl: {
          rejectUnauthorized: false
        }
      }),
      inject: [ConfigService]
    }),

    FirebaseModule.forRootAsync({
      useFactory: async (configService: ConfigService) => ({
        googleApplicationCredential: JSON.parse(configService.get('FIREBASE_CREDENTIALS'))
      }),
      inject: [ConfigService]
    }),

    CacheModule.registerAsync<RedisClientOptions>({
      isGlobal: true,
      useFactory: async (configService: ConfigService) => ({
        ttl: 300,
        max: 1000,

        store: redisStore,
        url: configService.get<string>('REDIS_HOST_URL'),
        username: configService.get<string>('REDIS_USERNAME'),
        password: configService.get<string>('REDIS_PASSWORD'),
        name: configService.get<string>('REDIS_DATABASE_NAME'),
      }),
      inject: [ConfigService]
    }),

    ThrottlerModule.forRoot({
      ttl: 60,
      limit: 10,
    }),

    AuthModule,
    DefaultAdminModule,
    UserModule,
    SavingsGroupModule,
    AccountModule,
    TransactionModule
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_INTERCEPTOR,
      useClass: HttpCacheInterceptor,   // Custom CacheInterceptor used here
    },
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard
    }
  ],
})
export class AppModule {

  constructor(private dataSource: DataSource) { }

}
