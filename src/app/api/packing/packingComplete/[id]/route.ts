import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

export async function POST(
    request: Request,
    { params }: { params: { id: string } }
  ) {
    try {
      
      const session = await getServerSession(authOptions);
      if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
  
      const billNo = parseInt(params.id);
      const organisationId = parseInt(session.user.id);
  
      const updatedBill = await prisma.transactionRecord.update({
        where: {
          billNo: billNo,
          organisationId: organisationId
        },
        data: {
          status: 'packed'
        },
        include: {
          customer: true,
          items: {
            include: {
              product: true
            }
          }
        }
      });
  
      if (!updatedBill) {
        return NextResponse.json(
          { error: 'Bill not found' },
          { status: 404 }
        );
      }

      revalidatePath('/transactions/online');
    revalidatePath('/dashboard');
  
      return NextResponse.json({ 
        success: true,
        message: 'Bill status updated successfully',
        data: updatedBill 
      });
  
    } catch (error) {
      console.error('Packing status update error:', error.message);
      return NextResponse.json(
        { error: 'Failed to update packing status' },
        { status: 500 }
      );
    }
  }