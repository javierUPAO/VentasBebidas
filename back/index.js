const { ApolloServer, gql } = require("apollo-server");

const typeDefs = gql`
  type Bebida {
    id: ID!
    name: String!
    brand: String!
    type: BeverageType!
    sales: Int
  }
  enum BeverageType {
    WATER
    COLA
  }
  enum Sort {
    NAME
    SALES
  }
  type Query {
    bebidas(
      type: BeverageType
      brand: String
      minSales: Int
      sortBy: Sort
    ): [Bebida!]!
  }
`;

const resolvers = {
  Query: {
    bebidas: async (_, args) => {
      let query = db.collection("bebidas");

      if (args.type) {
        query = query.where("type", "==", args.type);
      }

      if (args.brand) {
        query = query.where("brand", "==", args.brand);
      }

      if (args.minSales) {
        query = query.where("sales", ">=", args.minSales);
      }

      if (args.sortBy === "SALES") {
        query = query.orderBy("sales", "desc");
      }

      const snapshot = await query.get();
      return snapshot.docs.map((d) => d.data());
    },
  },
};

const server = new ApolloServer({
  typeDefs,
  resolvers,
});

server.listen().then(({ url }) => {
  console.log(url);
});
