import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      email,
      password,
      name,
      phone,
      companySize,
      shopName,
      flatNo,
      street,
      district,
      state,
      country,
      pincode,
      mobileNumber,
      websiteAddress,
      gstNumber,
    } = body;

    // Check if user exists
    const existingUser = await prisma.organisation.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { message: 'Email already registered' },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create organisation with trial subscription
    const organisation = await prisma.organisation.create({
      data: {
        email,
        password: hashedPassword,
        name,
        phone,
        companySize:'0',
        shopName,
        flatNo,
        street,
        district,
        state,
        country,
        pincode,
        mobileNumber,
        websiteAddress,
        gstNumber,
        subscriptionType: 'trial',
        // Set end date to yesterday for testing
        endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // +7 days from now
        smsCount: 0,
        smsCost: 0,
      },
    });

    return NextResponse.json(
      {
        message: 'Registration successful',
        organisation: {
          id: organisation.id,
          email: organisation.email,
          name: organisation.name,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Registration error:', error.message);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}