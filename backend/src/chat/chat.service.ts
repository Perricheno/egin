import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import {
  Chat,
  ChatMessage,
  ChatParticipant,
  ChatType,
} from './entities/chat.entity';
import { CreateDirectChatDto, SendMessageDto } from './dto/create-direct-chat.dto';

@Injectable()
export class ChatService {
  constructor(
    @InjectRepository(Chat)
    private readonly chatRepository: Repository<Chat>,
    @InjectRepository(ChatParticipant)
    private readonly participantRepository: Repository<ChatParticipant>,
    @InjectRepository(ChatMessage)
    private readonly messageRepository: Repository<ChatMessage>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  private async assertParticipant(chatId: string, userId: string) {
    const participant = await this.participantRepository.findOne({
      where: { chatId, userId },
    });

    if (!participant) {
      throw new ForbiddenException('You are not a participant of this chat');
    }
  }

  async createDirectChat(currentUserId: string, dto: CreateDirectChatDto) {
    if (currentUserId === dto.participantUserId) {
      throw new ForbiddenException('Cannot create a direct chat with yourself');
    }

    const participants = [currentUserId, dto.participantUserId].sort();

    const existingDirectChats = await this.chatRepository.find({
      where: {
        type: ChatType.DIRECT,
      },
      relations: ['participants'],
      order: { updatedAt: 'DESC' },
    });

    const existingChat = existingDirectChats.find((chat) => {
      const participantIds = (chat.participants ?? [])
        .map((participant) => participant.userId)
        .sort();

      return (
        participantIds.length === 2 &&
        participantIds[0] === participants[0] &&
        participantIds[1] === participants[1] &&
        (dto.listingId ? chat.listingId === dto.listingId : true)
      );
    });

    if (existingChat) {
      return this.getChatById(existingChat.id, currentUserId);
    }

    const users = await this.userRepository.find({
      where: { id: In(participants) },
    });

    if (users.length !== 2) {
      throw new NotFoundException('Participant user not found');
    }

    const chat = await this.chatRepository.save(
      this.chatRepository.create({
        type: ChatType.DIRECT,
        createdBy: currentUserId,
        listingId: dto.listingId,
      }),
    );

    await this.participantRepository.save(
      participants.map((userId) =>
        this.participantRepository.create({
          chatId: chat.id,
          userId,
        }),
      ),
    );

    return this.getChatById(chat.id, currentUserId);
  }

  async listChats(userId: string) {
    const participations = await this.participantRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });

    const chatIds = participations.map((participant) => participant.chatId);
    if (chatIds.length === 0) {
      return [];
    }

    const chats = await this.chatRepository.find({
      where: { id: In(chatIds) },
      relations: ['participants', 'messages'],
      order: { updatedAt: 'DESC' },
    });

    const userIds = Array.from(
      new Set(
        chats.flatMap((chat) =>
          (chat.participants ?? []).map((participant) => participant.userId),
        ),
      ),
    );
    const users = userIds.length
      ? await this.userRepository.find({ where: { id: In(userIds) } })
      : [];
    const userMap = new Map(users.map((user) => [user.id, user]));

    return chats.map((chat) => {
      const otherParticipants = (chat.participants ?? [])
        .filter((participant) => participant.userId !== userId)
        .map((participant) => {
          const user = userMap.get(participant.userId);

          return {
            userId: participant.userId,
            fullName: user?.fullName ?? 'Unknown user',
            role: user?.role ?? null,
            region: user?.region ?? null,
          };
        });

      const lastMessage = [...(chat.messages ?? [])].sort(
        (left, right) =>
          new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
      )[0];

      return {
        id: chat.id,
        type: chat.type,
        listingId: chat.listingId ?? null,
        participants: otherParticipants,
        lastMessage: lastMessage
          ? {
              id: lastMessage.id,
              body: lastMessage.body,
              senderId: lastMessage.senderId,
              createdAt: lastMessage.createdAt,
            }
          : null,
        updatedAt: chat.updatedAt,
        createdAt: chat.createdAt,
      };
    });
  }

  async getChatById(chatId: string, userId: string) {
    await this.assertParticipant(chatId, userId);

    const chat = await this.chatRepository.findOne({
      where: { id: chatId },
      relations: ['participants', 'messages'],
      order: { messages: { createdAt: 'ASC' } },
    });

    if (!chat) {
      throw new NotFoundException('Chat not found');
    }

    const users = await this.userRepository.find({
      where: {
        id: In((chat.participants ?? []).map((participant) => participant.userId)),
      },
    });
    const userMap = new Map(users.map((user) => [user.id, user]));

    return {
      id: chat.id,
      type: chat.type,
      listingId: chat.listingId ?? null,
      participants: (chat.participants ?? []).map((participant) => {
        const user = userMap.get(participant.userId);

        return {
          userId: participant.userId,
          fullName: user?.fullName ?? 'Unknown user',
          role: user?.role ?? null,
          region: user?.region ?? null,
        };
      }),
      messages: (chat.messages ?? []).map((message) => ({
        id: message.id,
        senderId: message.senderId,
        body: message.body,
        type: message.type,
        attachmentUrl: message.attachmentUrl ?? null,
        metadata: message.metadata ?? null,
        createdAt: message.createdAt,
      })),
      createdAt: chat.createdAt,
      updatedAt: chat.updatedAt,
    };
  }

  async sendMessage(chatId: string, userId: string, dto: SendMessageDto) {
    await this.assertParticipant(chatId, userId);

    const chat = await this.chatRepository.findOne({
      where: { id: chatId },
    });

    if (!chat) {
      throw new NotFoundException('Chat not found');
    }

    const message = await this.messageRepository.save(
      this.messageRepository.create({
        chatId,
        senderId: userId,
        body: dto.body.trim(),
        type: dto.type ?? 'text',
        attachmentUrl: dto.attachmentUrl,
      }),
    );

    await this.chatRepository.update(chatId, {
      updatedAt: new Date(),
    });

    return {
      id: message.id,
      chatId: message.chatId,
      senderId: message.senderId,
      body: message.body,
      type: message.type,
      attachmentUrl: message.attachmentUrl ?? null,
      createdAt: message.createdAt,
    };
  }
}
