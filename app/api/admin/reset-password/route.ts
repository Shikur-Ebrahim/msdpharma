
import { NextResponse } from 'next/server';
import admin from '@/lib/firebaseAdmin';

export async function POST(request: Request) {
    try {
        if (!admin.apps.length) {
            return NextResponse.json(
                { error: 'Server Misconfiguration: Firebase Admin not initialized. Missing Service Account Key.' },
                { status: 500 }
            );
        }

        const { phoneNumber, newPassword } = await request.json();

        if (!phoneNumber || !newPassword) {
            return NextResponse.json(
                { error: 'Phone number and new password are required.' },
                { status: 400 }
            );
        }

        // 1. Get user by phone number to find UID
        let userRecord;
        try {
            // Ensure phone number has '+' prefix if stored that way. 
            // The admin usually searches by phone, so we expect the full format or we adjust.
            // Assuming standardized "+251..." format in Auth.
            // If the input doesn't have '+', we might need to handle it, but for now let's assume valid input or handle generic "user not found".
            userRecord = await admin.auth().getUserByPhoneNumber(phoneNumber);
        } catch (error: any) {
            if (error.code === 'auth/user-not-found') {
                return NextResponse.json(
                    { error: 'No user found with this phone number.' },
                    { status: 404 }
                );
            }
            throw error;
        }

        // 2. Update the user's password
        await admin.auth().updateUser(userRecord.uid, {
            password: newPassword,
        });

        return NextResponse.json({
            success: true,
            message: `Password updated successfully for user ${phoneNumber}`,
        });

    } catch (error: any) {
        console.error('Error resetting password:', error);
        return NextResponse.json(
            { error: error.message || 'Internal Server Error' },
            { status: 500 }
        );
    }
}
