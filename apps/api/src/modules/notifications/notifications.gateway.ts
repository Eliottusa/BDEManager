import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';

@WebSocketGateway({ cors: { origin: process.env.FRONTEND_URL } })
export class NotificationsGateway {
  @WebSocketServer()
  server: Server;

  // TODO Wessim — notifyUser(userId, event): envoyer une notification temps réel à un utilisateur
  // TODO Wessim — notifyAll(event): broadcast à tous les connectés
  // Événements à émettre : 'notification', 'event:updated', 'registration:confirmed'
}
