export interface PropertyStruct {
    uniqueId: string;
    title: string;
    titleArabic: string;
    projectName: string;
    description: string;
    descriptionArabic: string;
    price: string;
    isFeatured: boolean;
    isDeleted: boolean;
    for: PropertyPurpose;
    categoryId: string;
    location: ILocation;
    features: IFeatures;
    images: string[];
    videos: {
        fileName: string,
        showInReels: boolean
    };
    sellerId: string;
    status: PropertyStatus;
    projectStatus: ProjectStatus;
    listedBy: ListedBy;
    furnishing: Furnishing;
    streetDirection: StreetDirection;
    propertyArea: string;
    propertyWidth: string;
    propertyDepth: string;
    streetWidth: string;
    views: number;
    likes: number;
    expiresAt?: Date;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface PropertyInputDTO {
    totalCount: number,
    data: PropertyStruct[]
}

export enum StreetDirection {
    SOUTH = 'south',
    EAST = 'east',
    WEST = 'west',
    NORTH = 'north',
    NORTH_EAST = "north-east",
    NORTH_WEST = "north-west",
    SOUTH_EAST = "south-east",
    SOUTH_WEST = "south-west",
}

export enum PropertyPurpose {
    SALE = 'sale',
    RENT = 'rent'
}

export enum Furnishing {
    SEMI_FURNISHED = 'semi-furnished',
    FURNISHED = 'furnished',
    UN_FURNISHED = 'un-furnished'
}

export enum ListedBy {
    OWNER = 'owner',
    BUILDER = 'builder',
    DEALER = 'broker/dealer'
}

export enum PropertyStatus {
    INCOMPLETE = 'incomplete',
    RE_PUBLISH = 're_publish',
    INITIATED = 'under_review',
    ACTIVE = 'active',
    REJECTED = 'rejected',
    EXPIRED = 'expired',
    UN_PUBLISH = 'un_publish',
    SOLD = 'sold',
    SUSPENDED = 'suspended',
}

export enum ProjectStatus {
    UNDER_CONSTRUCTION = "under_construction",
    READY_TO_MOVE = "ready_to_move",
    NEW_LAUNCH = "new_launch",
    RESALE_OLD_PROPERTY = "resale/old_property",
}

export interface ILocation {
    address: string;
    city: string;
    state: string;
    iso2Code: string;
    country: string;
    longitude: string;
    latitude: string;
    geo: {
        type: "Point";
        coordinates: [number, number];
    };
}

export enum zoomLevelToDistance {
    COUNTRY = 1000000,   // 1000 km
    STATE = 300000,      // 300 km
    CITY = 100000,        // 100 km
    AREA = 5000,        // 5 km
};

export interface IFeatures {
    floorNo: number;
    bedRooms: number;
    livingRooms: number;
    bathRooms: number;
    totalFloors: number;
    carParking: number;
    internalStair: boolean;
    lift: boolean;
    drainageAvailability: boolean;
    waterAvailability: boolean;
    electricalAvailability: boolean;
    network4g: boolean;
    network5g: boolean;
    kitchen: boolean;
    driverRoom: boolean;
    maidRoom: boolean;
    pool: boolean;
    basement: boolean;
}

export enum SortBy {
    RECENT = 'recent',
    PRICE_LTH = 'price_lth',
    PRICE_HTL = 'price_htl'
}