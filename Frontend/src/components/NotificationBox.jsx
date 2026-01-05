import React, { useState, useEffect, useRef } from 'react';
import { db } from '../firebaseConfig';
import { collection, query, where, onSnapshot, orderBy, updateDoc, doc, writeBatch } from 'firebase/firestore';
import { Link } from 'react-router-dom';
import { BellIcon } from '@heroicons/react/24/outline'; // Asegúrate de tener heroicons instalado o usa un svg
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

const NotificationBox = ({ userId }) => {
    const [notifications, setNotifications] = useState([]);
    const [isOpen, setIsOpen] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);
    const dropdownRef = useRef(null);

    useEffect(() => {
        if (!userId) return;

        const q = query(
            collection(db, 'notifications'),
            where('usuarioId', '==', userId)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const notifs = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            // Ordenamiento del lado del cliente para evitar requerir índice compuesto en Firestore
            notifs.sort((a, b) => new Date(b.fechaCreacion) - new Date(a.fechaCreacion));

            setNotifications(notifs);
            setUnreadCount(notifs.filter(n => !n.leido).length);
        });

        return () => unsubscribe();
    }, [userId]);

    // Cerrar dropdown al hacer click fuera
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [dropdownRef]);

    const markAsRead = async (notif) => {
        if (!notif.leido) {
            try {
                const notifRef = doc(db, 'notifications', notif.id);
                await updateDoc(notifRef, { leido: true });
            } catch (error) {
                console.error("Error al marcar como leída:", error);
            }
        }
        setIsOpen(false);
    };

    const markAllAsRead = async () => {
        const batch = writeBatch(db);
        const unreadNotifs = notifications.filter(n => !n.leido);

        unreadNotifs.forEach(notif => {
            const notifRef = doc(db, 'notifications', notif.id);
            batch.update(notifRef, { leido: true });
        });

        try {
            await batch.commit();
        } catch (error) {
            console.error("Error al marcar todas como leídas:", error);
        }
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 text-gray-600 hover:text-blue-900 focus:outline-none"
            >
                <BellIcon className="h-6 w-6" />
                {unreadCount > 0 && (
                    <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-red-100 transform translate-x-1/4 -translate-y-1/4 bg-red-600 rounded-full">
                        {unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <div className="absolute left-0 mt-2 w-80 bg-white rounded-md shadow-lg overflow-hidden z-50 border border-gray-200">
                    <div className="py-2 px-4 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
                        <span className="font-semibold text-gray-700">Notificaciones</span>
                        {unreadCount > 0 && (
                            <button
                                onClick={markAllAsRead}
                                className="text-xs text-blue-600 hover:underline"
                            >
                                Marcar todas leídas
                            </button>
                        )}
                    </div>
                    <div className="max-h-64 overflow-y-auto">
                        {notifications.length === 0 ? (
                            <p className="text-gray-500 text-center py-4 text-sm">No tienes notificaciones.</p>
                        ) : (
                            notifications.map((notif) => (
                                <Link
                                    key={notif.id}
                                    to={notif.link}
                                    onClick={() => markAsRead(notif)}
                                    className={`block px-4 py-3 border-b border-gray-100 hover:bg-gray-50 transition duration-150 ${!notif.leido ? 'bg-blue-50' : ''}`}
                                >
                                    <p className={`text-sm ${!notif.leido ? 'font-semibold text-gray-800' : 'text-gray-600'}`}>
                                        {notif.mensaje}
                                    </p>
                                    <p className="text-xs text-gray-400 mt-1">
                                        {formatDistanceToNow(new Date(notif.fechaCreacion), { addSuffix: true, locale: es })}
                                    </p>
                                </Link>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default NotificationBox;
