import { Injectable } from '@nestjs/common';

@Injectable()
export class AuthService {
  // TODO Jordan — register(dto): hash password, créer User, envoyer mail welcome, retourner tokens
  // TODO Jordan — login(dto): vérifier credentials, mettre user en cache Redis, retourner tokens
  // TODO Jordan — logout(userId): supprimer du cache Redis
  // TODO Jordan — refreshTokens(userId, token): vérifier refresh token stocké en Redis
}
