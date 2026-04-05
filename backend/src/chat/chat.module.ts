import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../users/entities/user.entity';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { Chat, ChatMessage, ChatParticipant } from './entities/chat.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Chat, ChatParticipant, ChatMessage, User]),
  ],
  controllers: [ChatController],
  providers: [ChatService],
})
export class ChatModule {}
