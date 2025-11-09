export interface ReportAdsStruct {
    uniqueId: string;
    propertyId: string;
    userId: string;
    remark: string;
    option: ReportOptions;
}

export enum ReportOptions {
    OFFENSIVE_CONTENT = "Offensive Content",
    FRAUD_SCAM = "Fraud/Scam",
    DUPLICATE_AD = "Duplicate Ad",
    PRODUCT_ALREADY_SOLD = "Product Already Sold",
    OTHER = "Other"
}

