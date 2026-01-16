const { ApolloServer, gql } = require("apollo-server");
const { db } = require("./firestoreConection");
const admin = require("firebase-admin");
const typeDefs = gql`
  type Bebida {
    id: ID!
    brand: String!
    type: BeverageType!
    sales: Int!
    count: Int!
    month: String!
  }

  type UpdateResponse {
    code: Int!
    message: String!
    succes: Boolean!
    bebida: Bebida!
  }

  type AddResponse {
    code: Int!
    message: String!
    succes: Boolean!
    bebida: Bebida
  }

  type DeleteResponse {
    code: Int!
    message: String!
    succes: Boolean!
  }

  input BebidaInput {
    brand: String!
    type: BeverageType!
    sales: Int = 0
    count: Int = 0
    month: String! = "2026-01"
  }

  input UpdateInput {
    brand: String
    type: BeverageType
    sales: Int
    count: Int
    month: String
  }

  input SaleInput {
    count: Int!
    sales: Int!
  }

  type SaleResponse {
    code: Int!
    message: String!
    succes: Boolean!
    bebida: Bebida
  }
  enum BeverageType {
    WATER
    COLA
  }
  enum Sort {
    BRAND
    SALES
  }

  type FiltroResult {
    result: [Bebida]!
    total: Int!
    cantidad: Int!
  }

  type Query {
    bebidas(
      type: BeverageType
      brand: String
      minSales: Int
      sortBy: Sort
    ): FiltroResult!
  }

  type Mutation {
    addBebida(input: BebidaInput!): AddResponse

    deleteBebida(id: ID!): DeleteResponse

    updateBebida(id: ID!, input: UpdateInput!): UpdateResponse

    addSale(id: ID!, input: SaleInput): SaleResponse
  }
`;

const resolvers = {
  Query: {
    bebidas: async (_, args = {}) => {
      let query = db.collection("bebidas");

      if (args.type !== undefined) {
        query = query.where("type", "==", args.type);
      }

      if (args.brand !== undefined) {
        query = query.where("brand", "==", args.brand);
      }

      if (args.minSales !== undefined) {
        query = query.where("sales", ">=", args.minSales);
        query = query.orderBy("sales", "desc");
      } else if (args.sortBy === "SALES") {
        query = query.orderBy("sales", "desc");
      } else if (args.sortBy === "BRAND") {
        query = query.orderBy("brand", "desc");
      }

      const snapshot = await query.get();

      const result = snapshot.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter((b) => b.brand && b.type && b.sales !== undefined);

      const total = result.reduce((sum, b) => sum + b.sales, 0);

      return {
        result,
        total,
        cantidad: result.length,
      };
    },
  },
  Mutation: {
    addBebida: async (_, { input }) => {
      try {
        const ref = db.collection("bebidas").doc();
        const bebida = {
          id: ref.id,
          brand: input.brand,
          type: input.type,
          sales: input.sales,
          count: input.count,
          month: input.month,
        };

        await ref.set({
          id: ref.id,
          brand: bebida.brand,
          type: bebida.type,
          sales: bebida.sales,
          count: bebida.count,
          month: bebida.month,
        });

        return {
          code: 200,
          message: "Bebida creada correctamente",
          succes: true,
          bebida: bebida,
        };
      } catch (err) {
        return {
          code: 500,
          message: "Error al crear la bebida " + err,
          succes: false,
          bebida: null,
        };
      }
    },
    deleteBebida: async (_, { id }) => {
      try {
        let code = 500;
        let messag = "Error al eliminar la bebida";
        let succes = false;
        const ref = db.collection("bebidas").doc(id);

        const snap = await ref.get();

        if (snap.exists) {
          code = 200;
          messag = "Bebida eliminada";
          succes = true;
        }

        await ref.delete();

        return {
          code: code,
          message: messag,
          succes: succes,
        };
      } catch (err) {
        return {
          code: code,
          message: messag + err,
          succes: succes,
        };
      }
    },
    updateBebida: async (_, { id, input }) => {
      try {
        const ref = db.collection("bebidas").doc(id);
        const snap = await ref.get();
        if (!snap.exists) {
          return {
            code: 500,
            success: false,
            message: "La bebida no existe",
            bebida: null,
          };
        }
        await ref.update({
          ...(input.brand && { brand: input.brand }),
          ...(input.type && { type: input.type }),
          ...(input.sales !== undefined && { sales: input.sales }),
          ...(input.count !== undefined && { count: input.count }),
          ...(input.month !== undefined && { month: input.month }),
        });

        const updated = await ref.get();

        return {
          code: 200,
          message: "Bebida actualizada correctamente",
          succes: true,
          bebida: {
            id: updated.id,
            ...updated.data(),
          },
        };
      } catch (err) {
        return {
          code: 200,
          message: "Error al actualizar bebida ",
          succes: false,
          bebida: null,
        };
      }
    },
    addSale: async (_, { id, input }) => {
      try {
        const ref = db.collection("bebidas").doc(id);
        let salesToAdd = 0;
        let countToAdd = 1;

        if (typeof input.sales === "number") {
          salesToAdd = input.sales;
        }

        if (typeof input.count === "number" && input.count > 0) {
          countToAdd = input.count;
        }
        await ref.update({
          sales: admin.firestore.FieldValue.increment(salesToAdd),
          count: admin.firestore.FieldValue.increment(countToAdd),
        });

        const snap = await ref.get();

        return {
          code: 200,
          succes: true,
          message: "Venta registrada",
          bebida: snap.data(),
        };
      } catch (error) {
        return {
          code: 500,
          message: "Error al registrar la venta " + error,
          succes: false,
          bebida: null,
        };
      }
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
