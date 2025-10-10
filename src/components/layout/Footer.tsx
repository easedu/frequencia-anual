import React from "react";

export default function Footer() {
    return (
        <footer className="bg-white dark:bg-gray-800 shadow mt-8">
            <div className="container mx-auto px-4 py-4 text-center">
                <p>
                    &copy; {new Date().getFullYear()} Gestão Escolar. Todos os direitos
                    reservados. By EAS
                </p>
            </div>
        </footer>
    );
}