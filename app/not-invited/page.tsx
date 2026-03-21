export default function NotInvitedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f5f4f1]">
      <div className="text-center space-y-3 max-w-sm px-6">
        <p className="text-[15px] text-foreground font-medium">Access restricted</p>
        <p className="text-[13px] text-muted-foreground leading-relaxed">
          Your account hasn't been set up yet. Please contact your administrator to get access.
        </p>
      </div>
    </div>
  )
}
