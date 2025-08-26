export type Organisation = {

    id: number;
    email: string;
    name: string;
    shopName: string;
    flatNo: string;
    street: string;
    district: string;
    city: string | null;
    state: string;
    country: string;
    pincode: string;
    phone: string; // This was in your Prisma model
    mobileNumber: string;
    landlineNumber: string | null;
    websiteAddress: string | null;
    gstNumber: string | null;

};