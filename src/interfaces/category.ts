
export interface CategoryStruct {
    uniqueId: string;
    name: CategoryNames;
    nameArabic: string;
    forSell: boolean;
    forRent: boolean;
    icon: string;
    description?: string;
    createdAt?: Date;
    updatedAt?: Date;
}

export enum CategoryNames {
    VILLA = 'villa',
    HOUSE = 'house',
    LAND = 'land',
    FLAT = 'flat',
    CABIN = 'cabin',
    ROOM = 'room',
    HOTEL = 'hotel',
    OFFICE = 'office',
    APARTMENT = 'apartment',
    BUILDING = 'building',
    WAREHOUSE = 'warehouse',
    SHOP = 'shop',
}