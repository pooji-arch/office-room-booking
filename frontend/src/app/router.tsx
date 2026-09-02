import { createBrowserRouter, Navigate } from "react-router-dom"
import { RequireAuth } from "@/routes/RequireAuth"
import { RequireRole } from "@/routes/RequireRole"
import { AdminLayout } from "@/layouts/AdminLayout"
import { UserLayout } from "@/layouts/UserLayout"
import { AuthLayout } from "@/layouts/AuthLayout"

import { LoginPage } from "@/pages/auth/LoginPage"

import { RoomsManagementPage } from "@/pages/admin/RoomsManagementPage"
import { RoomFormPage } from "@/pages/admin/RoomFormPage"
import { MeetingsManagementPage } from "@/pages/admin/MeetingsManagementPage"
import { MeetingCreatePage } from "@/pages/admin/MeetingCreatePage"
import { MeetingDetailsPage as AdminMeetingDetailsPage } from "@/pages/admin/MeetingDetailsPage"
import { MeetingEditPage } from "@/pages/admin/MeetingEditPage"
import { UsersManagementPage } from "@/pages/admin/UsersManagementPage"
import { UserFormPage } from "@/pages/admin/UserFormPage"
import { CalendarViewPage } from "@/pages/admin/CalendarViewPage"
import { ManagementReportingPage } from "@/pages/admin/ManagementReportingPage"
import { SettingsPage } from "@/pages/admin/SettingsPage"

import { ProfilePage } from "@/pages/shared/ProfilePage"
import { NotificationsPage } from "@/pages/shared/NotificationsPage"

import { HomePage } from "@/pages/user/HomePage"
import { RoomDetailsPage } from "@/pages/user/RoomDetailsPage"
import { RoomCalendarViewPage } from "@/pages/user/RoomCalendarViewPage"
import { MyMeetingsPage } from "@/pages/user/MyMeetingsPage"
import { UserMeetingDetailsPage } from "@/pages/user/UserMeetingDetailsPage"
import { MeetingReschedulePage } from "@/pages/user/MeetingReschedulePage"

import { RootRedirect } from "@/pages/RootRedirect"

export const router = createBrowserRouter([
  {
    element: <AuthLayout />,
    children: [{ path: "/login", element: <LoginPage /> }],
  },
  {
    element: <RequireAuth />,
    children: [
      {
        element: <RequireRole allow={["ADMIN"]} />,
        children: [
          {
            path: "/admin",
            element: <AdminLayout />,
            children: [
              { index: true, element: <Navigate to="/admin/rooms" replace /> },
              { path: "rooms", element: <RoomsManagementPage /> },
              { path: "rooms/new", element: <RoomFormPage /> },
              { path: "rooms/:id/edit", element: <RoomFormPage /> },
              { path: "meetings", element: <MeetingsManagementPage /> },
              { path: "meetings/new", element: <MeetingCreatePage /> },
              { path: "meetings/:id", element: <AdminMeetingDetailsPage /> },
              { path: "meetings/:id/edit", element: <MeetingEditPage /> },
              { path: "users", element: <UsersManagementPage /> },
              { path: "users/new", element: <UserFormPage /> },
              { path: "users/:id/edit", element: <UserFormPage /> },
              { path: "calendar", element: <CalendarViewPage /> },
              { path: "reports", element: <ManagementReportingPage /> },
              { path: "settings", element: <SettingsPage /> },
              { path: "profile", element: <ProfilePage /> },
            ],
          },
        ],
      },
      {
        element: <RequireRole allow={["USER"]} />,
        children: [
          {
            path: "/",
            element: <UserLayout />,
            children: [
              { index: true, element: <HomePage /> },
              { path: "rooms/:id", element: <RoomDetailsPage /> },
              { path: "rooms/:id/calendar", element: <RoomCalendarViewPage /> },
              { path: "meetings", element: <MyMeetingsPage /> },
              { path: "meetings/:id", element: <UserMeetingDetailsPage /> },
              { path: "meetings/:id/reschedule", element: <MeetingReschedulePage /> },
              { path: "profile", element: <ProfilePage /> },
              { path: "notifications", element: <NotificationsPage /> },
            ],
          },
        ],
      },
      { path: "*", element: <RootRedirect /> },
    ],
  },
  { path: "*", element: <Navigate to="/login" replace /> },
])
