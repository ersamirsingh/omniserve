

const restaurants = [
  {
    id: 1,
    name: "Pizza Hub",
    image:
      "https://images.unsplash.com/photo-1513104890138-7c749659a591",
    cuisine: "Italian",
  },
  {
    id: 2,
    name: "Burger Point",
    image:
      "https://images.unsplash.com/photo-1568901346375-23c9450c58cd",
    cuisine: "Fast Food",
  },
  {
    id: 3,
    name: "Spice Kitchen",
    image:
      "https://images.unsplash.com/photo-1585937421612-70a008356fbe",
    cuisine: "Indian",
  },
];

export default function FoodMesh() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <nav className="bg-white shadow-md">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-orange-500">
            FoodMesh
          </h1>

          <div className="space-x-6">
            <a href="#" className="hover:text-orange-500">
              Home
            </a>
            <a href="#" className="hover:text-orange-500">
              Restaurants
            </a>
            <a href="#" className="hover:text-orange-500">
              About
            </a>
            <button className="bg-orange-500 text-white px-4 py-2 rounded-lg">
              Login
            </button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-7xl mx-auto px-6 py-20 grid md:grid-cols-2 gap-10 items-center">
        <div>
          <h1 className="text-5xl font-bold leading-tight">
            Delicious Food,
            <span className="text-orange-500">
              {" "}
              Delivered Fast
            </span>
          </h1>

          <p className="mt-6 text-gray-600 text-lg">
            Discover the best restaurants near you and
            enjoy your favorite meals delivered to your
            doorstep.
          </p>

          <div className="mt-8 flex">
            <input
              type="text"
              placeholder="Search food..."
              className="w-full p-4 rounded-l-lg border"
            />
            <button className="bg-orange-500 text-white px-6 rounded-r-lg">
              Search
            </button>
          </div>
        </div>

        <div>
          <img
            src="https://images.unsplash.com/photo-1504674900247-0877df9cc836"
            alt="food"
            className="rounded-3xl shadow-xl"
          />
        </div>
      </section>

      {/* Restaurants */}
      <section className="max-w-7xl mx-auto px-6 py-16">
        <h2 className="text-3xl font-bold text-center mb-10">
          Popular Restaurants
        </h2>

        <div className="grid md:grid-cols-3 gap-8">
          {restaurants.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-2xl shadow-lg overflow-hidden hover:scale-105 transition"
            >
              <img
                src={item.image}
                alt={item.name}
                className="h-56 w-full object-cover"
              />

              <div className="p-5">
                <h3 className="text-xl font-bold">
                  {item.name}
                </h3>

                <p className="text-gray-500">
                  {item.cuisine}
                </p>

                <button className="mt-4 bg-orange-500 text-white px-4 py-2 rounded-lg">
                  Order Now
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="bg-orange-500 text-white py-16">
        <div className="max-w-6xl mx-auto px-6 grid md:grid-cols-3 gap-10 text-center">
          <div>
            <h3 className="text-2xl font-bold">
              🚀 Fast Delivery
            </h3>
            <p className="mt-3">
              Food delivered in under 30 minutes.
            </p>
          </div>

          <div>
            <h3 className="text-2xl font-bold">
              🍔 1000+ Restaurants
            </h3>
            <p className="mt-3">
              Huge variety of cuisines and dishes.
            </p>
          </div>

          <div>
            <h3 className="text-2xl font-bold">
              ⭐ Best Quality
            </h3>
            <p className="mt-3">
              Trusted restaurants and fresh meals.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-black text-white text-center py-6">
        <p>
          © 2026 FoodMesh. All rights reserved.
        </p>
      </footer>
    </div>
  );
}