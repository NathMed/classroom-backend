import { and, desc, eq, getTableColumns, ilike, or, sql } from "drizzle-orm";
import express from "express";
import { departments, subjects } from "../db/schema";
import { db } from "../db";

const router = express.Router()

// Get all subject with optional search, filtering and pagination
router.get('/', async (req, res) => {
    try {
        const {search, department, page = 1, limit = 10} = req.query;

        // at least 1 page or more
        const currentPage = Math.max(1, +page);
        const limitPerPage = Math.min(100, Math.max(1, +limit))

        // how many records to skip to get to the next page
        const offset = (currentPage - 1) * limitPerPage;

        const filterConditions = [];

        // if search query exists, filter by subject name OR subject code
        if (search) {
            filterConditions.push(
                or(
                    ilike(subjects.name, `%${search}%`),
                    ilike(subjects.code, `%${search}%`),
                )
            );
        }

        // if department filter exists, match department name
        if (department) {
            filterConditions.push(ilike(departments.name, `%${department}%`))
        }

        // Combine all filters using AND if any exist
        const whereClause = filterConditions.length > 0 ? and( ...filterConditions) : undefined;

        const countResult = await db
            .select({count: sql<number>`count(*)`})
            .from(subjects)
            .leftJoin(departments, eq(subjects.departmentId, departments.id))
            .where(whereClause)

        // ?? means if it doesn't exist then 0
        const totalCount = countResult[0]?.count ?? 0

        // getTableColumns, get all the columns of that specific tables then you can add more table using ,
        const subjectsList = await db
            .select({
                ... getTableColumns(subjects), 
                department: {...getTableColumns(departments)}
            })
            .from(subjects)
            .leftJoin(departments, eq(subjects.departmentId, departments.id))
            .where(whereClause)
            .orderBy(desc(subjects.createdAt))
            .limit(limitPerPage)
            .offset(offset)
        
        res.status(200).json({
            data: subjectsList,
            pagination: {
                page: currentPage,
                limit: limitPerPage,
                total: totalCount,
                totalPages: Math.ceil(totalCount/limitPerPage),
            }
        })

    } catch (e) {
        console.error(`GET /subjects error: ${e}`)
        res.status(500).json({error: 'Failed to get subject'})
    }
})


export default router;