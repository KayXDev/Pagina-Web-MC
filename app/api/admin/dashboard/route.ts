import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/session';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import Product from '@/models/Product';
import Ticket from '@/models/Ticket';
import BlogPost from '@/models/BlogPost';
import StaffApplication from '@/models/StaffApplication';
import AdminLog from '@/models/AdminLog';
import ForumPost from '@/models/ForumPost';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    await requireAdmin();
    await dbConnect();
    
    const [
      totalUsers,
      bannedUsers,
      staffUsers,
      adminUsers,
      activeProducts,
      totalProducts,
      totalTickets,
      ticketsOpen,
      ticketsInProgress,
      ticketsClosed,
      postsPublished,
      postsDrafts,
      forumPosts,
      applicationsNew,
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ isBanned: true }),
      User.countDocuments({ role: 'STAFF' }),
      User.countDocuments({ role: { $in: ['ADMIN', 'OWNER'] } }),
      Product.countDocuments({ isActive: true }),
      Product.countDocuments(),
      Ticket.countDocuments(),
      Ticket.countDocuments({ status: 'OPEN' }),
      Ticket.countDocuments({ status: 'IN_PROGRESS' }),
      Ticket.countDocuments({ status: 'CLOSED' }),
      BlogPost.countDocuments({ isPublished: true }),
      BlogPost.countDocuments({ isPublished: false }),
      ForumPost.countDocuments(),
      StaffApplication.countDocuments({ status: 'NEW' }),
    ]);

    const [recentUsers, recentTickets, recentApplications, recentLogs, recentBlogPosts, recentForumPosts] =
      await Promise.all([
        User.find()
          .sort({ createdAt: -1 })
          .limit(5)
          .select('-password')
          .lean(),
        Ticket.find().sort({ createdAt: -1 }).limit(5).lean(),
        StaffApplication.find()
          .sort({ createdAt: -1 })
          .limit(5)
          .select('username discord status createdAt userId')
          .lean(),
        AdminLog.find()
          .sort({ createdAt: -1 })
          .limit(6)
          .select('adminUsername action targetType targetId details createdAt')
          .lean(),
        BlogPost.find()
          .sort({ createdAt: -1 })
          .limit(5)
          .select('title slug isPublished author createdAt publishedAt')
          .lean(),
        ForumPost.find()
          .sort({ createdAt: -1 })
          .limit(5)
          .select('title category authorUsername createdAt')
          .lean(),
      ]);
    
    return NextResponse.json({
      stats: {
        totalUsers,
        bannedUsers,
        staffUsers,
        adminUsers,
        activeProducts,
        totalProducts,
        totalTickets,
        ticketsOpen,
        ticketsInProgress,
        ticketsClosed,
        postsPublished,
        postsDrafts,
        forumPosts,
        applicationsNew,
      },
      recentUsers,
      recentTickets,
      recentApplications,
      recentLogs,
      recentBlogPosts,
      recentForumPosts,
    });
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message === 'Forbidden: Admin access required') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }
    
    console.error('Error fetching dashboard data:', error);
    return NextResponse.json(
      { error: 'Error al obtener datos del dashboard' },
      { status: 500 }
    );
  }
}
