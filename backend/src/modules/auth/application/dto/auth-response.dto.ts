export class AuthResponseDto {
  accessToken!: string;
  refreshToken!: string;
  user!: {
    id: string;
    email: string;
    username: string;
    displayName: string;
    role: string;
  };
}

export class RefreshResponseDto {
  accessToken!: string;
  refreshToken!: string;
}
