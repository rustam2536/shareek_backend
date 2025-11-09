import { Document, Model } from 'mongoose';
import { IUser } from '@/interfaces/IUser';
import { LoginLogs } from '@/interfaces/logs/loginLogs';
import { PropertyStruct } from '@/interfaces/property';
import { CategoryStruct } from '@/interfaces/category';
import { ChatMessageStruct, ChatStruct, RoomStruct } from '@/interfaces/chat';
import { NotificationStruct } from '@/interfaces/notification';
import { CitiesStruct } from '@/interfaces/cities';
import { CommentsStruct } from '@/interfaces/comments';
import { ReportAdsStruct } from '@/interfaces/reportAds';
import { ReportUserStruct } from '@/interfaces/reportUser';
import { CountryStruct } from '@/interfaces/country';
declare global {
  namespace Express {
    export interface Request {
      currentUser: IUser & Document;
    }
  }

  namespace Models {
    export type UserModel = Model<IUser & Document>;
  }

  namespace Models {
    export type LoginLogsModel = Model<LoginLogs & Document>;
  }

  namespace Models {
    export type PropertyModel = Model<PropertyStruct & Document>;
  }

  namespace Models {
    export type ChatModel = Model<ChatStruct & Document>;
  }

  namespace Models {
    export type ChatMessageModel = Model<ChatMessageStruct & Document>;
  }

  namespace Models {
    export type NotificationModel = Model<NotificationStruct & Document>;
  }

  namespace Models {
    export type CategoryModel = Model<CategoryStruct & Document>;
  }

  namespace Models {
    export type CitiesModel = Model<CitiesStruct & Document>;
  }

  namespace Models {
    export type CommentsModel = Model<CommentsStruct & Document>;
  }

  namespace Models {
    export type ReportAdsModel = Model<ReportAdsStruct & Document>;
  }

  namespace Models {
    export type ReportUserModel = Model<ReportUserStruct & Document>;
  }

  namespace Models {
    export type RoomModel = Model<RoomStruct & Document>;
  }

  namespace Models {
    export type CountryModel = Model<CountryStruct & Document>;
  }

}
