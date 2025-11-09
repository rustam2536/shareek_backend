export interface CommentsStruct {
    uniqueId: string;
    propertyId: string;
    text: string;
    userId: string;
    isAnonymous: boolean;
    commentBy: ReplyBy;    // must always be either 'owner' or 'user'
    isApproved: boolean; // also fixed typo: was isAppoaved
    reply?: ReplyStruct; // optional, since not all comments may have replies
}

export interface ReplyStruct {
    text: string;
    replyBy: ReplyBy;    // must always be either 'owner' or 'user'
    replier: string;
    replyAt: string;
}

export enum ReplyBy {
    OWNER = 'owner',
    USER = 'user'
}
