// app/api/settings/whatsapp/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth-options';

// Helper function to create consistent error responses
function createErrorResponse(message: string, status: number, details?: any) {
  const response = {
    success: false,
    error: message,
    details: process.env.NODE_ENV === 'development' ? details : undefined
  };
  
  console.log('Error response:', JSON.stringify(response, null, 2));
  return NextResponse.json(response, { 
    status,
    headers: {
      'Content-Type': 'application/json',
    }
  });
}

// Helper function to create success responses
function createSuccessResponse(data: any, message?: string) {
  const response = {
    success: true,
    data,
    message
  };
  
  console.log('Success response:', JSON.stringify(response, null, 2));
  return NextResponse.json(response, {
    headers: {
      'Content-Type': 'application/json',
    }
  });
}

export async function GET(request: NextRequest) {
  try {
    console.log('GET /api/settings/whatsapp - Starting');
    
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return createErrorResponse('Unauthorized', 401);
    }

    const organisationId = parseInt(session.user.id);
    if (isNaN(organisationId)) {
      return createErrorResponse('Invalid organisation ID', 400);
    }

    const settings = await prisma.gowhats.findUnique({
      where: { organisationId },
    });

    // --- CHANGE THIS BLOCK ---
    if (!settings) {
      // OLD: return createSuccessResponse(null, 'No WhatsApp settings found');
      // NEW: Return a proper 404 error
      return createErrorResponse('WhatsApp settings have not been configured', 404);
    }

    const responseData = {
      whatsappNumber: settings.whatsappNumber,
      goWhatsApiToken: settings.accessToken,
      phoneNumberId: settings.phoneNumberId,
      businessAccountId: settings.businessId,
      whatsappEnabled: true
    };

    return createSuccessResponse(responseData, 'WhatsApp settings retrieved successfully');
  } catch (error) {
    console.error('GET Error:', error);
    return createErrorResponse('Failed to fetch WhatsApp settings', 500, error);
  }
}

export async function PUT(request: NextRequest) {
  console.log('PUT /api/settings/whatsapp - Starting');
  console.log('Request method:', request.method);
  console.log('Request URL:', request.url);
  
  let prismaTransaction;
  
  try {
    // Step 1: Check session
    const session = await getServerSession(authOptions);
    console.log('Session check:', session ? 'Valid' : 'Invalid');

    if (!session?.user?.id) {
      console.log('No valid session found - returning 401');
      return createErrorResponse('Unauthorized', 401);
    }

    // Step 2: Parse request body with error handling
    console.log('Parsing request body...');
    let body;
    
    try {
      const rawBody = await request.text();
      console.log('Raw body length:', rawBody.length);
      
      if (!rawBody.trim()) {
        return createErrorResponse('Request body is empty', 400);
      }
      
      body = JSON.parse(rawBody);
      console.log('Parsed body keys:', Object.keys(body || {}));
    } catch (parseError) {
      console.error('JSON parsing error:', parseError);
      return createErrorResponse('Invalid JSON in request body', 400, parseError);
    }

    // Step 3: Validate body structure
    if (!body || typeof body !== 'object') {
      console.log('Invalid body type:', typeof body);
      return createErrorResponse('Request body must be a valid JSON object', 400);
    }

    const {
      whatsappNumber,
      goWhatsApiToken,
      phoneNumberId,
      businessAccountId,
      whatsappEnabled = true // Default to true if not provided
    } = body;

    console.log('Extracted fields:', {
      whatsappNumber: whatsappNumber ? 'Present' : 'Missing',
      goWhatsApiToken: goWhatsApiToken ? 'Present' : 'Missing',
      phoneNumberId: phoneNumberId ? 'Present' : 'Missing',
      businessAccountId: businessAccountId ? 'Present' : 'Missing',
      whatsappEnabled
    });

    // Step 4: Validate required fields with better validation
    const requiredFields = [
      { name: 'whatsappNumber', value: whatsappNumber },
      { name: 'goWhatsApiToken', value: goWhatsApiToken },
      { name: 'phoneNumberId', value: phoneNumberId },
      { name: 'businessAccountId', value: businessAccountId }
    ];

    const missingFields = requiredFields
      .filter(field => !field.value || !field.value.toString().trim())
      .map(field => field.name);

    if (missingFields.length > 0) {
      console.log('Missing or empty fields:', missingFields);
      return NextResponse.json({
        success: false,
        error: 'Missing required fields',
        missing: missingFields,
        required: requiredFields.map(f => f.name)
      }, { 
        status: 400,
        headers: {
          'Content-Type': 'application/json',
        }
      });
    }

    // Step 5: Validate organisation ID
    const organisationId = parseInt(session.user.id);
    console.log('Organisation ID:', organisationId);

    if (isNaN(organisationId)) {
      console.log('Invalid organisation ID');
      return createErrorResponse('Invalid organisation ID', 400);
    }

    // Step 6: Enhanced WhatsApp number validation
    const cleanWhatsappNumber = whatsappNumber.toString().trim();
    const phoneRegex = /^\+?[1-9]\d{1,14}$/; // E.164 format
    
    if (!phoneRegex.test(cleanWhatsappNumber)) {
      return createErrorResponse(
        'Invalid WhatsApp number format. Please use international format (e.g., +919876543210)', 
        400
      );
    }

    // Step 7: Validate token length - Updated to handle longer tokens
    const cleanToken = goWhatsApiToken.toString().trim();
    console.log('Token length:', cleanToken.length);
    
    // WhatsApp tokens can be quite long, but let's set a reasonable limit
    if (cleanToken.length > 2000) {
      return createErrorResponse('Access token is too long. Maximum 2000 characters allowed.', 400);
    }

    if (cleanToken.length < 50) {
      return createErrorResponse('Access token appears to be too short. Please verify the token.', 400);
    }

    // Step 8: Database operations with transaction
    console.log('Starting database operations...');
    
    // Use a transaction to ensure data consistency
    prismaTransaction = await prisma.$transaction(async (tx) => {
      console.log('Checking for existing settings...');
      const existing = await tx.gowhats.findUnique({
        where: { organisationId },
      });

      console.log('Existing record:', existing ? 'Found' : 'Not found');

      const dataToSave = {
        whatsappNumber: cleanWhatsappNumber,
        accessToken: cleanToken,
        businessId: businessAccountId.toString().trim(),
        phoneNumberId: phoneNumberId.toString().trim(),
      };

      console.log('Data to save:', {
        ...dataToSave,
        accessToken: `***HIDDEN*** (length: ${cleanToken.length})`
      });

      let result;
      if (existing) {
        console.log('Updating existing record with ID:', existing.id);
        result = await tx.gowhats.update({
          where: { organisationId },
          data: dataToSave,
        });
        console.log('Update successful');
      } else {
        console.log('Creating new record...');
        result = await tx.gowhats.create({
          data: {
            organisationId,
            ...dataToSave,
          },
        });
        console.log('Create successful with ID:', result.id);
      }

      return { result, isUpdate: !!existing };
    });

    console.log('Database transaction completed successfully');

    // Step 9: Prepare response data
    const responseData = {
      id: prismaTransaction.result.id,
      whatsappNumber: prismaTransaction.result.whatsappNumber,
      phoneNumberId: prismaTransaction.result.phoneNumberId,
      businessAccountId: prismaTransaction.result.businessId,
      whatsappEnabled: true,
      // Never return access token in response for security
    };

    const message = prismaTransaction.isUpdate
      ? 'WhatsApp settings updated successfully' 
      : 'WhatsApp settings created successfully';

    console.log('Operation completed:', message);
    return createSuccessResponse(responseData, message);

  } catch (error) {
    // Fixed error handling to prevent TypeError
    let errorDetails;
    let errorMessage = 'Failed to save WhatsApp settings';
    let statusCode = 500;

    try {
      // Safely handle the error object
      if (error && typeof error === 'object') {
        errorDetails = {
          name: (error as any)?.name || 'Unknown',
          message: (error as any)?.message || 'Unknown error',
          code: (error as any)?.code || null,
          meta: (error as any)?.meta || null
        };
        
        console.error('PUT Error - Full details:', errorDetails);
      } else {
        console.error('PUT Error - Non-object error:', String(error));
        errorDetails = { message: String(error) };
      }
    } catch (logError) {
      console.error('Error while logging error:', logError);
      errorDetails = { message: 'Error occurred but could not be logged' };
    }

    // Handle Prisma-specific errors
    const errorObj = error as any;
    if (errorObj?.code) {
      switch (errorObj.code) {
        case 'P2002':
          errorMessage = 'WhatsApp settings already exist for this organisation';
          statusCode = 409;
          break;
        case 'P2003':
          errorMessage = 'Invalid reference to organisation';
          statusCode = 400;
          break;
        case 'P2025':
          errorMessage = 'Organisation not found';
          statusCode = 404;
          break;
        case 'P2016':
          errorMessage = 'Query interpretation error. Please check your data format.';
          statusCode = 400;
          break;
        default:
          console.log('Unhandled Prisma error code:', errorObj.code);
      }
    }

    // Handle other specific errors
    if (errorObj?.message) {
      const errorMsg = errorObj.message.toLowerCase();
      
      if (errorMsg.includes('too long for the column')) {
        errorMessage = 'Access token is too long for the database. Please contact support to increase the column size.';
        statusCode = 400;
      } else if (errorMsg.includes('unique constraint')) {
        errorMessage = 'This WhatsApp configuration already exists';
        statusCode = 409;
      } else if (errorMsg.includes('foreign key constraint')) {
        errorMessage = 'Invalid organisation reference';
        statusCode = 400;
      } else if (errorMsg.includes('connection')) {
        errorMessage = 'Database connection error. Please try again.';
        statusCode = 503;
      }
    }

    return createErrorResponse(errorMessage, statusCode, {
      timestamp: new Date().toISOString(),
      ...(process.env.NODE_ENV === 'development' && errorDetails)
    });

  } finally {
    // Ensure Prisma connection is properly closed
    try {
      await prisma.$disconnect();
      console.log('Prisma connection closed successfully');
    } catch (disconnectError) {
      console.error('Error disconnecting Prisma:', disconnectError);
    }
  }
}