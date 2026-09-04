import { useStoreContext } from '../contexts/StoreContext';

export const useStoreCart = () => {
    const { cart, addToCart, removeFromCart, updateQuantity, clearCart, cartTotals } = useStoreContext();

    return {
        cartItems: cart,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        totals: cartTotals
    };
};
