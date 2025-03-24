// Add declaration file for passport to use custom User type
import { User } from '@shared/schema';

declare global {
  namespace Express {
    interface User extends User {}
  }
}

// Add declaration for passport-google-oauth20
declare module 'passport-google-oauth20' {
  import { Strategy as PassportStrategy } from 'passport';
  
  export class Strategy extends PassportStrategy {
    constructor(
      options: {
        clientID: string;
        clientSecret: string;
        callbackURL: string;
      },
      verify: (
        accessToken: string,
        refreshToken: string,
        profile: any,
        done: (error: any, user?: any) => void
      ) => void
    );
  }
}