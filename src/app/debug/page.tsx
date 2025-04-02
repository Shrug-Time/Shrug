export default function DebugIndex() {
  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Debug Tools</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <DebugCard 
          title="Client Logs" 
          description="View client-side console logs and errors in real-time"
          link="/debug/client-logs"
          color="bg-blue-500"
        />
        
        <DebugCard 
          title="Profile Test" 
          description="Test user profile and posts fetching functionality"
          link="/debug/profile-test"
          color="bg-green-500"
        />
        
        <DebugCard 
          title="Login" 
          description="Test authentication functionality"
          link="/debug/login"
          color="bg-purple-500"
        />
        
        <DebugCard 
          title="API Tests" 
          description="Test various API endpoints"
          link="#"
          color="bg-yellow-500"
          dropdown={[
            { name: "Current User", url: "/api/debug/auth/current-user" },
            { name: "User Posts", url: "/api/debug/user/YOUR_USER_ID/posts" },
            { name: "Data Audit", url: "/api/admin/data-normalization/audit?collection=posts" }
          ]}
        />
      </div>
      
      <div className="mt-8 p-4 bg-gray-100 rounded-lg">
        <h2 className="text-xl font-bold mb-2">Debugging Tips</h2>
        <ul className="list-disc pl-5 space-y-2">
          <li>Use the <strong>Client Logs</strong> page to view console output from the browser</li>
          <li>Use the <strong>Profile Test</strong> page to test fetching user profiles and posts</li>
          <li>Use the <strong>Login</strong> page to authenticate and test with your own account</li>
          <li>Check the API endpoints directly to see raw data responses</li>
          <li>For data normalization issues, use the audit API endpoint</li>
        </ul>
      </div>
    </div>
  );
}

function DebugCard({ 
  title, 
  description, 
  link, 
  color,
  dropdown
}: { 
  title: string; 
  description: string; 
  link: string; 
  color: string;
  dropdown?: Array<{name: string, url: string}>;
}) {
  return (
    <div className="rounded-lg shadow-md overflow-hidden">
      <div className={`${color} p-4`}>
        <h2 className="text-xl font-bold text-white">{title}</h2>
      </div>
      <div className="p-4 bg-white">
        <p className="text-gray-600 mb-4">{description}</p>
        {dropdown ? (
          <div className="space-y-2">
            {dropdown.map((item, index) => (
              <a 
                key={index}
                href={item.url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="block text-blue-500 hover:text-blue-700"
              >
                {item.name} →
              </a>
            ))}
          </div>
        ) : (
          <a 
            href={link} 
            className="inline-block bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-2 px-4 rounded"
          >
            Open Tool
          </a>
        )}
      </div>
    </div>
  );
} 