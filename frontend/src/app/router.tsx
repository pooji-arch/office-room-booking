import { createBrowserRouter, Navigate } from "react-router-dom"
import { RequireAuth } from "@/routes/RequireAuth"
import { RequireRole } from "@/routes/RequireRole"
import { AdminLayout } from "@/layouts/AdminLayout"
import { UserLayout } from "@/layouts/UserLayout"
import { AuthLayout } from "@/layouts/AuthLayout"

import { LoginPage } from "@/pages/auth/LoginPage"

import { RoomsManagementPage } from "@/pages/admin/RoomsManagementPage"
import { RoomFormPage } from "@/pages/admin/RoomFormPage"
import { BookingsManagementPage } from "@/pages/admin/BookingsManagementPage"
import { BookingDetailsPage as AdminBookingDetailsPage } from "@/pages/admin/BookingDetailsPage"
import { UsersManagementPage } from "@/pages/admin/UsersManagementPage"
import { UserFormPage } from "@/pages/admin/UserFormPage"
import { CalendarViewPage } from "@/pages/admin/CalendarViewPage"
import { SettingsPage } from "@/pages/admin/SettingsPage"

import { ProfilePage } from "@/pages/shared/ProfilePage"

import { HomePage } from "@/pages/user/HomePage"
import { RoomDetailsPage } from "@/pages/user/RoomDetailsPage"
import { RoomCalendarViewPage } from "@/pages/user/RoomCalendarViewPage"
import { MyBookingsPage } from "@/pages/user/MyBookingsPage"
import { UserBookingDetailsPage } from "@/pages/user/UserBookingDetailsPage"
import { NotificationsPage } from "@/pages/user/NotificationsPage"
import { HelpSupportPage } from "@/pages/user/HelpSupportPage"

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
              { path: "bookings", element: <BookingsManagementPage /> },
              { path: "bookings/:id", element: <AdminBookingDetailsPage /> },
              { path: "users", element: <UsersManagementPage /> },
              { path: "users/new", element: <UserFormPage /> },
              { path: "users/:id/edit", element: <UserFormPage /> },
              { path: "calendar", element: <CalendarViewPage /> },
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
              { path: "my-bookings", element: <MyBookingsPage /> },
              { path: "my-bookings/:id", element: <UserBookingDetailsPage /> },
              { path: "profile", element: <ProfilePage /> },
              { path: "notifications", element: <NotificationsPage /> },
              { path: "help", element: <HelpSupportPage /> },
            ],
          },
        ],
      },
      { path: "*", element: <RootRedirect /> },
    ],
  },
  { path: "*", element: <Navigate to="/login" replace /> },
])
