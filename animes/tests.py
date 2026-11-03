import json

from django.test import TestCase

from .models import Anime


class AnimeApiTests(TestCase):
    def test_crear_listar_actualizar_y_eliminar_anime(self):
        crear = self.client.post(
            '/api/animes/',
            data=json.dumps({'apodo': 'Naruto', 'titulo': 'Naruto'}),
            content_type='application/json',
        )
        self.assertEqual(crear.status_code, 201)
        anime_id = crear.json()['id']

        lista = self.client.get('/api/animes/')
        self.assertEqual(lista.status_code, 200)
        self.assertEqual(lista.json()[0]['apodo'], 'Naruto')

        actualizar = self.client.patch(
            f'/api/animes/{anime_id}/',
            data=json.dumps({'visto': True}),
            content_type='application/json',
        )
        self.assertEqual(actualizar.status_code, 200)
        self.assertTrue(Anime.objects.get(pk=anime_id).visto)

        eliminar = self.client.delete(
            f'/api/animes/{anime_id}/',
            content_type='application/json',
        )
        self.assertEqual(eliminar.status_code, 200)
        self.assertFalse(Anime.objects.filter(pk=anime_id).exists())

    def test_rechaza_anime_sin_nombre(self):
        respuesta = self.client.post(
            '/api/animes/',
            data=json.dumps({'titulo': 'Sin apodo'}),
            content_type='application/json',
        )
        self.assertEqual(respuesta.status_code, 400)
        self.assertIn('obligatorio', respuesta.json()['error'])
