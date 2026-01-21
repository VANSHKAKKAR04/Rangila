export default function AboutPage() {
  return (
    <section>
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-6">About Rangila Gift Shop</h1>
        
        <div className="prose prose-lg max-w-none">
          <p className="text-lg text-gray-700 mb-6">
            At Rangila Gift Shop, we believe that every gift tells a story. Since our founding,
            we've been dedicated to helping you find the perfect present for every occasion, whether
            it's a birthday, anniversary, wedding, or just because.
          </p>

          <div className="bg-orange-50 border-l-4 border-orange-500 p-6 mb-8">
            <h2 className="text-2xl font-semibold mb-4">Our Mission</h2>
            <p className="text-gray-700">
              To bring joy and happiness to people's lives through thoughtfully curated gifts
              that celebrate relationships and create lasting memories.
            </p>
          </div>

          <h2 className="text-3xl font-bold mb-4 mt-12">What Makes Us Special</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h3 className="text-xl font-semibold mb-3">🎯 Curated Selection</h3>
              <p className="text-gray-700">
                Our team handpicks every product, ensuring quality and uniqueness. We partner
                with trusted artisans and suppliers to bring you the best gifts.
              </p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md">
              <h3 className="text-xl font-semibold mb-3">💝 Personalized Service</h3>
              <p className="text-gray-700">
                We understand that every gift is special. That's why we offer personalization
                options and gift wrapping services to make your present truly memorable.
              </p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md">
              <h3 className="text-xl font-semibold mb-3">🚚 Reliable Delivery</h3>
              <p className="text-gray-700">
                We ensure your gifts reach their destination on time, every time. Our efficient
                delivery network spans across India, bringing smiles wherever you need.
              </p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md">
              <h3 className="text-xl font-semibold mb-3">😊 Customer Satisfaction</h3>
              <p className="text-gray-700">
                Your happiness is our priority. Our dedicated customer service team is always
                ready to help you find the perfect gift or resolve any concerns.
              </p>
            </div>
          </div>

          <h2 className="text-3xl font-bold mb-4 mt-12">Our Story</h2>
          <p className="text-gray-700 mb-4">
            Rangila Gift Shop started with a simple idea: make gift-giving easy, thoughtful, and
            joyful. What began as a small boutique has grown into a trusted destination for gift
            lovers across India.
          </p>
          <p className="text-gray-700 mb-8">
            Today, we offer a wide range of products from traditional items to modern accessories,
            all selected with care to ensure they bring genuine happiness to recipients.
          </p>

          <div className="bg-orange-100 rounded-lg p-8 text-center">
            <h2 className="text-2xl font-semibold mb-4">Ready to Make Someone's Day?</h2>
            <p className="text-gray-700 mb-6">
              Browse our catalogue and find the perfect gift for your loved ones.
            </p>
            <a
              href="/products"
              className="btn-primary inline-block"
            >
              Explore Our Catalogue
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
