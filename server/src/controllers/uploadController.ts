import { Request, Response } from 'express';
import { prisma } from '../db/index';
import csvParser from 'csv-parser';
import { Readable } from 'stream';

export const uploadInvoices = async (req: any, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const results: any[] = [];
    const stream = Readable.from(req.file.buffer.toString());

    // Parse the CSV
    stream
      .pipe(csvParser())
      .on('data', (data) => results.push(data))
      .on('end', async () => {
        try {
          // Save to the staging table
          for (const row of results) {
            await prisma.invoiceStaging.create({
              data: {
                invoiceNumber: row.invoice_number || 'UNKNOWN',
                amount: parseFloat(row.amount) || 0,
                date: new Date(row.date || Date.now()),
                rawRow: row,
                status: 'pending'
              }
            });
          }

          return res.status(200).json({ 
            message: `Successfully parsed and saved ${results.length} rows to staging!`,
            totalRows: results.length
          });
        } catch (dbError) {
          console.error("Database Error:", dbError);
          return res.status(500).json({ error: 'Failed to save to database' });
        }
      })
      .on('error', (error) => {
        console.error("CSV Error:", error);
        return res.status(400).json({ error: 'Failed to parse CSV' });
      });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// --- FUNCTION TO APPROVE INVOICES ---
export const approveStaging = async (req: Request, res: Response) => {
  try {
    // 1. Get all pending invoices from staging
    const pendingInvoices = await prisma.invoiceStaging.findMany({
      where: { status: 'pending' }
    });

    if (pendingInvoices.length === 0) {
      return res.status(400).json({ message: 'No pending invoices to approve.' });
    }

    // 2. Move them to the main Invoice table
    for (const staging of pendingInvoices) {
      // We use "upsert" here so if the invoice already exists, it doesn't crash the app
      await prisma.invoice.upsert({
        where: { invoiceNumber: staging.invoiceNumber },
        update: {}, // If it exists, do nothing
        create: {
          invoiceNumber: staging.invoiceNumber,
          amount: staging.amount,
          date: staging.date,
          vendorEmail: staging.vendorEmail
        }
      });
    }

    // 3. Delete them from staging
    await prisma.invoiceStaging.deleteMany({
      where: { status: 'pending' }
    });

    return res.status(200).json({ 
      message: `Successfully approved and moved ${pendingInvoices.length} invoices to the main table!` 
    });

  } catch (error) {
    console.error("Approve Error:", error);
    return res.status(500).json({ error: 'Failed to approve invoices' });
  }
};

export const getStagingInvoices = async (req: Request, res: Response) => {
  try {
    const pendingInvoices = await prisma.invoiceStaging.findMany({
      where: { status: 'pending' },
      orderBy: { id: 'asc' } // Keep them in the order they were uploaded
    });
    return res.status(200).json(pendingInvoices);
  } catch (error) {
    console.error("Fetch Error:", error);
    return res.status(500).json({ error: 'Failed to fetch staging data' });
  }
};